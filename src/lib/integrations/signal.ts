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
import { categorise } from "../catalog";
import { isoWeekKey } from "../time";

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
  /** The family's own recipes from SIGNAL "My recipes". */
  myRecipes?: Recipe[];
  error?: string;
  busy: boolean;
}

export const useSignal = create<SignalState>(() => ({ ready: !signalConfigured, busy: false }));

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
  useSignal.setState({ userId: undefined, email: undefined, list: undefined, picks: undefined });
}

export async function refreshSignal() {
  try {
    const [list, picks, myRecipes] = await Promise.all([fetchList(), fetchPicks(), fetchMyRecipes().catch(() => undefined)]);
    useSignal.setState({ list, picks, error: undefined, ...(myRecipes ? { myRecipes } : {}) });
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

export function signalAddItem(name: string, category?: string, recipe?: string) {
  const clean = name.trim();
  if (!clean) return Promise.resolve();
  return mutateList((row) => {
    if (row.custom.some((i) => i.name.toLowerCase() === clean.toLowerCase() && !row.checked[itemKey(i)])) return;
    row.custom.push({
      name: clean,
      totalQty: 1,
      unit: "",
      category: category ?? categorise(clean),
      searchTerm: clean.toLowerCase(),
      isCustom: true,
      ...(recipe ? { recipeSays: recipe } : {}),
    });
  });
}

/** Add several things at once (one save), e.g. a recipe's ingredients. Returns how many were new. */
export async function signalAddItems(items: { name: string; category?: string }[], recipe?: string): Promise<number> {
  let added = 0;
  await mutateList((row) => {
    added = 0;
    for (const it of items) {
      const clean = it.name.trim();
      if (!clean) continue;
      if (row.custom.some((i) => i.name.toLowerCase() === clean.toLowerCase() && !row.checked[itemKey(i)])) continue;
      row.custom.push({
        name: clean,
        totalQty: 1,
        unit: "",
        category: it.category ?? categorise(clean),
        searchTerm: clean.toLowerCase(),
        isCustom: true,
        ...(recipe ? { recipeSays: recipe } : {}),
      });
      added++;
    }
  });
  return added;
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
  return /^(https?:|data:)/.test(r.image) ? r.image : `${SIGNAL_SITE}${r.image}`;
}

/* ── The family's own recipes (SIGNAL "My recipes", public.user_recipes) ── */

interface UserRecipeRow {
  id: string;
  title: string;
  category: string;
  ingredients: string[];
  instructions: string[];
  estimated_time: number | null;
  image_url: string | null;
  source_url: string | null;
}

const CATEGORY_FROM_SIGNAL: Record<string, string> = { Breakfast: "breakfast", Lunch: "meal", Dinner: "meal", Snack: "snack", Baking: "baking" };

function fromRow(r: UserRecipeRow): Recipe {
  return {
    id: `user:${r.id}`,
    name: r.title,
    image: r.image_url,
    ingredients: r.ingredients ?? [],
    serves: null,
    time: r.estimated_time ? `${r.estimated_time} min` : null,
    category: CATEGORY_FROM_SIGNAL[r.category] ?? "meal",
    method: r.instructions ?? [],
    mine: true,
    sourceUrl: r.source_url,
  };
}

async function fetchMyRecipes(): Promise<Recipe[]> {
  const uid = useSignal.getState().userId;
  if (!uid) return [];
  const { data, error } = await sb()
    .from("user_recipes")
    .select("id, title, category, ingredients, instructions, estimated_time, image_url, source_url")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as UserRecipeRow[]).map(fromRow);
}

export interface NewRecipe {
  title: string;
  category: string;
  ingredients: string[];
  instructions: string[];
  estimated_time: number | null;
  image_url: string | null;
  source_url: string | null;
}

/** Save to SIGNAL "My recipes" (the same table SIGNAL's own Add recipe writes). */
export async function saveMyRecipe(input: NewRecipe): Promise<Recipe> {
  const uid = useSignal.getState().userId;
  if (!uid) throw new Error("Sign in to SIGNAL in Parent → Connections first.");
  const { data, error } = await sb()
    .from("user_recipes")
    .insert({ user_id: uid, ...input })
    .select("id, title, category, ingredients, instructions, estimated_time, image_url, source_url")
    .single();
  if (error) throw error;
  const recipe = fromRow(data as UserRecipeRow);
  useSignal.setState((s) => ({ myRecipes: [recipe, ...(s.myRecipes ?? [])] }));
  return recipe;
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
