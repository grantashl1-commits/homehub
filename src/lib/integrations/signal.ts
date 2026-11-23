/**
 * SIGNAL connector. The hub signs into SIGNAL's own Supabase as Mum (email +
 * password, once per device) and reads/writes her rows under SIGNAL's RLS —
 * no changes to the live SIGNAL app are needed.
 *
 *  - Shopping list: public.shopping_lists, one row per ISO week. The hub adds
 *    and ticks `custom_items`; SIGNAL also lists meal-plan ingredients.
 *  - Meal plan: public.user_plans (plan_type "nutrition",
 *    plan_data.kind "signal_custom_picks_v1") → { "YYYY-MM-DD": { dinner: recipeId } }.
 *  - Recipes: SIGNAL's static recipe library, exported to /data/signal-recipes.json.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import type { ListItem, Recipe } from "../types";
import { categoriseItem, parseIngredient, parseQty, toNZName } from "../signal-parity";
import { dateKey, isoWeekKey } from "../time";

const URL = import.meta.env.VITE_SIGNAL_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SIGNAL_SUPABASE_KEY as string | undefined;
export const SIGNAL_SITE = ((import.meta.env.VITE_SIGNAL_SITE_URL as string | undefined) ?? "https://signal.mindcast.co.nz").replace(/\/$/, "");

export const signalConfigured = !!(URL && KEY);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!signalConfigured) throw new Error("SIGNAL isn't configured on this deployment.");
  client ??= createClient(URL!, KEY!, {
    auth: {
      storageKey: "homehub-signal-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

interface AggregatedItem {
  name: string;
  totalQty: number;
  unit: string;
  category: string;
  searchTerm: string;
  isPantryStaple?: boolean;
  isCustom?: boolean;
  recipeSays?: string;
}

type Picks = Record<string, Partial<Record<"breakfast" | "lunch" | "dinner", string>>>;
const PICKS_KIND = "signal_custom_picks_v1";

/** SIGNAL's own key for a checked item. */
function itemKey(i: AggregatedItem): string {
  return `${i.category}:${i.name}:${i.unit}:${i.totalQty}`;
}

interface SignalState {
  ready: boolean;
  userId?: string;
  email?: string;
  list?: ListItem[];
  picks?: Picks;
  /** SIGNAL library recipe ids the member has hearted (user_saved_recipes). */
  favourites: string[];
  /** SIGNAL habit ids completed today (habit_completions). */
  todayDone: string[];
  error?: string;
  busy: boolean;
}

export const useSignal = create<SignalState>(() => ({ ready: !signalConfigured, busy: false, favourites: [], todayDone: [] }));

let started = false;
export function startSignal() {
  if (started || !signalConfigured) return;
  started = true;
  const c = sb();
  void c.auth.getSession().then(({ data }) => {
    useSignal.setState({ ready: true, userId: data.session?.user.id, email: data.session?.user.email });
    if (data.session) void refreshSignal();
  });
  c.auth.onAuthStateChange((_e, session) => {
    useSignal.setState({ userId: session?.user.id, email: session?.user.email });
  });
  window.setInterval(() => {
    if (useSignal.getState().userId && document.visibilityState === "visible") void refreshSignal();
  }, 20_000);
}

export async function signalSignIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  useSignal.setState({ userId: data.user.id, email: data.user.email, error: undefined });
  await refreshSignal();
}

export async function signalSignOut() {
  await sb().auth.signOut();
  useSignal.setState({ userId: undefined, email: undefined, list: undefined, picks: undefined, favourites: [], todayDone: [] });
}

export async function refreshSignal() {
  try {
    const [list, picks, favourites, todayDone] = await Promise.all([fetchList(), fetchPicks(), fetchFavourites(), fetchHabitCompletions()]);
    useSignal.setState({ list, picks, favourites, todayDone, error: undefined });
  } catch (e) {
    useSignal.setState({ error: e instanceof Error ? e.message : String(e) });
  }
}

/* ── Shopping list ─────────────────────────────────────────────────────── */

async function readRow(uid: string, weekKey: string) {
  const { data, error } = await sb()
    .from("shopping_lists")
    .select("checked_items, custom_items")
    .eq("user_id", uid)
    .eq("week_key", weekKey)
    .maybeSingle();
  if (error) throw error;
  return {
    checked: ((data?.checked_items as Record<string, boolean>) ?? {}) as Record<string, boolean>,
    custom: ((data?.custom_items as AggregatedItem[]) ?? []) as AggregatedItem[],
  };
}

function toListItems(row: { checked: Record<string, boolean>; custom: AggregatedItem[] }): ListItem[] {
  return row.custom.map((i, idx) => ({
    id: itemKey(i),
    name: i.name,
    category: i.category,
    checked: !!row.checked[itemKey(i)],
    recipe: i.recipeSays,
    createdAt: Date.now() - idx,
  }));
}

async function fetchList(): Promise<ListItem[]> {
  const uid = useSignal.getState().userId;
  if (!uid) return [];
  return toListItems(await readRow(uid, isoWeekKey()));
}

/** Read the freshest row, change it, write it back (SIGNAL may have edited it too). */
async function mutateList(
  fn: (row: { checked: Record<string, boolean>; custom: AggregatedItem[] }) => void,
) {
  const uid = useSignal.getState().userId;
  if (!uid) throw new Error("Connect SIGNAL first.");
  const weekKey = isoWeekKey();
  useSignal.setState({ busy: true });
  try {
    const row = await readRow(uid, weekKey);
    fn(row);
    const { error } = await sb()
      .from("shopping_lists")
      .upsert(
        { user_id: uid, week_key: weekKey, checked_items: row.checked, custom_items: row.custom },
        { onConflict: "user_id,week_key" },
      );
    if (error) throw error;
    useSignal.setState({ list: toListItems(row), error: undefined });
  } finally {
    useSignal.setState({ busy: false });
  }
}

export function signalAddItem(name: string, _category?: string, recipe?: string) {
  const clean = name.trim();
  if (!clean) return Promise.resolve();
  // Shape the item exactly as SIGNAL's own "add item" does, so the stored
  // fields (and therefore the itemKey) match SIGNAL's and tick state shares.
  const parsed = parseIngredient(clean);
  const nzName = toNZName(parsed.name);
  const nzSearch = toNZName(parsed.searchTerm);
  const item = {
    name: nzName.charAt(0).toUpperCase() + nzName.slice(1),
    totalQty: parseQty(parsed.quantity) || 1,
    unit: parsed.unit,
    category: categoriseItem(nzName),
    searchTerm: nzSearch,
    isCustom: true,
    ...(recipe ? { recipeSays: recipe } : {}),
  };
  return mutateList((row) => {
    if (row.custom.some((i) => i.searchTerm.toLowerCase() === item.searchTerm.toLowerCase() && !row.checked[itemKey(i)])) return;
    row.custom.push(item);
  });
}

export function signalToggleItem(id: string) {
  return mutateList((row) => {
    row.checked[id] = !row.checked[id];
  });
}

export function signalRemoveItem(id: string) {
  return mutateList((row) => {
    row.custom = row.custom.filter((i) => itemKey(i) !== id);
    delete row.checked[id];
  });
}

export function signalClearChecked() {
  return mutateList((row) => {
    row.custom = row.custom.filter((i) => !row.checked[itemKey(i)]);
    for (const k of Object.keys(row.checked)) if (row.checked[k]) delete row.checked[k];
  });
}

/* ── Meal plan picks ───────────────────────────────────────────────────── */

async function fetchPicks(): Promise<Picks> {
  const uid = useSignal.getState().userId;
  if (!uid) return {};
  const { data, error } = await sb()
    .from("user_plans")
    .select("id, plan_data")
    .eq("user_id", uid)
    .eq("plan_type", "nutrition")
    .eq("plan_data->>kind", PICKS_KIND)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data?.plan_data as { picks?: Picks } | null)?.picks ?? {}) as Picks;
}

export async function signalSetDinner(date: string, recipeId: string) {
  const uid = useSignal.getState().userId;
  if (!uid) throw new Error("Connect SIGNAL first.");
  const c = sb();
  const { data, error } = await c
    .from("user_plans")
    .select("id, plan_data")
    .eq("user_id", uid)
    .eq("plan_type", "nutrition")
    .eq("plan_data->>kind", PICKS_KIND)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const picks: Picks = { ...((data?.plan_data as { picks?: Picks } | null)?.picks ?? {}) };
  picks[date] = { ...picks[date], dinner: recipeId };
  const plan_data = { kind: PICKS_KIND, picks, updatedAt: Date.now() };
  const write = data
    ? c.from("user_plans").update({ plan_data, generated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", uid)
    : c.from("user_plans").insert({ user_id: uid, plan_type: "nutrition", plan_data });
  const { error: werr } = await write;
  if (werr) throw werr;
  useSignal.setState({ picks });
}

/* ── Favourites (user_saved_recipes) ───────────────────────────────────── */

const FAVOURITE_PREFIX = "favourite:";

async function fetchFavourites(): Promise<string[]> {
  const uid = useSignal.getState().userId;
  if (!uid) return [];
  const { data, error } = await sb()
    .from("user_saved_recipes")
    .select("recipe_id")
    .eq("user_id", uid);
  if (error) throw error;
  return ((data as { recipe_id: string }[] | null) ?? [])
    .map((r) => r.recipe_id)
    .filter((id) => id.startsWith(FAVOURITE_PREFIX))
    .map((id) => id.slice(FAVOURITE_PREFIX.length));
}

/** Heart or un-heart a SIGNAL library recipe. Resolves to whether it is now a favourite. */
export async function signalToggleFavourite(recipeId: string): Promise<boolean> {
  const uid = useSignal.getState().userId;
  if (!uid) throw new Error("Connect SIGNAL first.");
  const isFav = useSignal.getState().favourites.includes(recipeId);
  const key = FAVOURITE_PREFIX + recipeId;
  if (isFav) {
    const { error } = await sb().from("user_saved_recipes").delete().eq("user_id", uid).eq("recipe_id", key);
    if (error) throw error;
    useSignal.setState({ favourites: useSignal.getState().favourites.filter((id) => id !== recipeId) });
  } else {
    const { error } = await sb().from("user_saved_recipes").insert({ user_id: uid, recipe_id: key });
    // 23505: already favourited on the server (stale local state) — that's the state we want.
    if (error && (error as { code?: string }).code !== "23505") throw error;
    useSignal.setState({ favourites: [...useSignal.getState().favourites, recipeId] });
  }
  return !isFav;
}

/* ── Habits (habit_completions) ────────────────────────────────────────── */

async function fetchHabitCompletions(): Promise<string[]> {
  const uid = useSignal.getState().userId;
  if (!uid) return [];
  const { data, error } = await sb()
    .from("habit_completions")
    .select("habit_id")
    .eq("user_id", uid)
    .eq("completed_date", dateKey());
  if (error) throw error;
  return ((data as { habit_id: string }[] | null) ?? []).map((r) => r.habit_id);
}

/** Mark a SIGNAL habit done (or undo) for a local date, exactly as SIGNAL does. */
export async function signalSetHabitDone(habitId: string, date: string, done: boolean): Promise<void> {
  const uid = useSignal.getState().userId;
  if (!uid) throw new Error("Connect SIGNAL first.");
  if (done) {
    const { error } = await sb()
      .from("habit_completions")
      .upsert(
        { user_id: uid, habit_id: habitId, completed_date: date, completed_at: new Date().toISOString() },
        { onConflict: "user_id,habit_id,completed_date" },
      );
    if (error) throw error;
  } else {
    const { error } = await sb().from("habit_completions").delete().eq("user_id", uid).eq("habit_id", habitId).eq("completed_date", date);
    if (error) throw error;
  }
  useSignal.setState((s) => ({ todayDone: done ? [...new Set([...s.todayDone, habitId])] : s.todayDone.filter((id) => id !== habitId) }));
}

/* ── Recipe library ────────────────────────────────────────────────────── */

let recipesPromise: Promise<Map<string, Recipe>> | null = null;

export function loadRecipes(): Promise<Map<string, Recipe>> {
  recipesPromise ??= fetch("/data/signal-recipes.json")
    .then((r) => r.json() as Promise<Recipe[]>)
    .then((list) => new Map(list.map((r) => [r.id, r])))
    .catch((e) => {
      recipesPromise = null;
      throw e;
    });
  return recipesPromise;
}

export function recipeImage(r: Recipe | undefined | null): string | undefined {
  if (!r?.image) return undefined;
  return r.image.startsWith("http") ? r.image : `${SIGNAL_SITE}${r.image}`;
}

/* ── Habit library (static export) ────────────────────────────────────── */

export interface SignalHabit {
  id: string;
  name: string;
  icon: string;
  category: string;
  frequency: string;
  art: string | null;
}

let habitsPromise: Promise<SignalHabit[]> | null = null;

export function loadSignalHabits(): Promise<SignalHabit[]> {
  habitsPromise ??= fetch("/data/signal-habits.json")
    .then((r) => r.json() as Promise<SignalHabit[]>)
    .catch((e) => {
      habitsPromise = null;
      throw e;
    });
  return habitsPromise;
}

export function habitArt(h: SignalHabit | null | undefined): string | undefined {
  if (!h?.art) return undefined;
  return h.art.startsWith("http") ? h.art : `${SIGNAL_SITE}${h.art}`;
}

/** Strip quantities so "250g chicken thighs, diced" becomes "chicken thighs". */
export function ingredientName(line: string): string {
  return line
    .replace(/\(.*?\)/g, "")
    .replace(/^[\d½¼¾⅓⅔.,/\s-]+/, "")
    .replace(/^(g|kg|ml|l|tsp|tbsp|cups?|cans?|tins?|pinch|handful|bunch|cloves?|large|small|medium|x)\b\.?\s*/i, "")
    .replace(/^(of)\s+/i, "")
    .split(",")[0]
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
