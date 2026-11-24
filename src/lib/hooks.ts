/**
 * UI-facing hooks that merge the hub's own state with whatever is connected
 * (SIGNAL, PointPals). Screens use these and never care where data lives.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHub } from "./store";
import { addDays, dateKey, fromDateKey, startOfWeek } from "./time";
import type { Chore, ListItem, Member, Recipe } from "./types";
import {
  ingredientName,
  loadRecipes,
  signalAddItems,
  signalAddItem,
  signalClearChecked,
  signalRemoveItem,
  signalToggleItem,
  useSignal,
} from "./integrations/signal";
import { usePointPals } from "./integrations/pointpals";
import { SAMPLE_DINNERS } from "./sample";
import { categorise } from "./catalog";

export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useMember(id: string | undefined): Member | undefined {
  return useHub((s) => s.members.find((m) => m.id === id));
}

/* ── Chores & jars ─────────────────────────────────────────────────────── */

export interface ChoreView extends Chore {
  state: "todo" | "pending" | "done";
}

export function useChoresFor(member: Member | undefined): { chores: ChoreView[]; source: "pointpals" | "local" } {
  const pp = usePointPals();
  const localChores = useHub((s) => s.localChores);
  const claims = useHub((s) => s.claims);
  const today = dateKey();

  return useMemo(() => {
    if (!member) return { chores: [], source: "local" as const };
    const linked = !!(pp.userId && member.pointpalsKidId);
    const base: Chore[] = linked
      ? pp.chores.filter(
          (c) => !c.memberIds || c.memberIds.length === 0 || c.memberIds.includes(member.pointpalsKidId!),
        )
      : localChores.filter((c) => !c.memberIds || c.memberIds.includes(member.id));
    const mine = claims.filter((c) => c.memberId === member.id && c.date === today);
    return {
      source: linked ? ("pointpals" as const) : ("local" as const),
      chores: base.map((c) => {
        const claim = mine.find((x) => x.choreId === c.id && x.status !== "rejected");
        const awarded = linked && pp.doneToday.has(`${member.pointpalsKidId}|${c.name}`);
        const state: ChoreView["state"] =
          claim?.status === "approved" || awarded ? "done" : claim?.status === "pending" ? "pending" : "todo";
        return { ...c, state };
      }),
    };
  }, [member, pp.userId, pp.chores, pp.doneToday, localChores, claims, today]);
}

export function useFamilyJar(): { count: number; target: number; reward: string; source: "pointpals" | "local" } {
  const hh = usePointPals((s) => (s.userId ? s.household : undefined));
  const local = useHub((s) => s.familyJar);
  const target = useHub((s) => s.settings.familyJarTarget);
  const reward = useHub((s) => s.settings.familyJarReward);
  if (hh) {
    return {
      count: hh.sharedPool,
      target: hh.activeRewardTarget ?? hh.rewardTarget,
      reward: hh.activeRewardName ?? "our family reward",
      source: "pointpals",
    };
  }
  return { count: local, target, reward, source: "local" };
}

export function useMarbles(member: Member | undefined): number {
  const kids = usePointPals((s) => (s.userId ? s.kids : undefined));
  const local = useHub((s) => (member ? s.marbles[member.id] ?? 0 : 0));
  if (member?.pointpalsKidId && kids) {
    const k = kids.find((x) => x.id === member.pointpalsKidId);
    if (k) return k.currentPoints;
  }
  return local;
}

/* ── Shopping list ─────────────────────────────────────────────────────── */

/**
 * Put a recipe's ingredients on the shopping list (SIGNAL when connected, else
 * this screen's list), skipping anything already on it. Each item is labelled
 * with the recipe so it's easy to delete what's already in the cupboard.
 * Returns how many were added.
 */
export async function addRecipeToList(recipe: Recipe): Promise<number> {
  const names = [...new Set(recipe.ingredients.map(ingredientName).filter(Boolean))];
  if (!names.length) return 0;
  if (useSignal.getState().userId) {
    return signalAddItems(names.map((name) => ({ name })), recipe.name);
  }
  const hub = useHub.getState();
  const before = hub.localList.length;
  for (const n of names) hub.addLocalItem(n, categorise(n), undefined, recipe.name);
  return useHub.getState().localList.length - before;
}

export function useShoppingList() {
  const signalUser = useSignal((s) => s.userId);
  const signalList = useSignal((s) => s.list);
  const busy = useSignal((s) => s.busy);
  const local = useHub((s) => s.localList);
  const { addLocalItem, toggleLocalItem, removeLocalItem, clearLocalChecked } = useHub.getState();
  const connected = !!signalUser;
  const [optimistic, setOptimistic] = useState<ListItem[] | null>(null);

  useEffect(() => setOptimistic(null), [signalList]);

  const items = connected ? (optimistic ?? signalList ?? []) : local;

  const add = useCallback(
    async (name: string, opts: { category?: string; by?: string; recipe?: string } = {}) => {
      const category = opts.category ?? categorise(name);
      if (!connected) return addLocalItem(name, category, opts.by, opts.recipe);
      setOptimistic([
        { id: `tmp-${name}`, name, category, checked: false, addedBy: opts.by, createdAt: Date.now() },
        ...(signalList ?? []),
      ]);
      await signalAddItem(name, category, opts.recipe);
    },
    [connected, signalList, addLocalItem],
  );

  const toggle = useCallback(
    async (id: string) => {
      if (!connected) return toggleLocalItem(id);
      setOptimistic((signalList ?? []).map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
      await signalToggleItem(id);
    },
    [connected, signalList, toggleLocalItem],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!connected) return removeLocalItem(id);
      setOptimistic((signalList ?? []).filter((i) => i.id !== id));
      await signalRemoveItem(id);
    },
    [connected, signalList, removeLocalItem],
  );

  const clearChecked = useCallback(async () => {
    if (!connected) return clearLocalChecked();
    setOptimistic((signalList ?? []).filter((i) => !i.checked));
    await signalClearChecked();
  }, [connected, signalList, clearLocalChecked]);

  return { items, source: connected ? ("signal" as const) : ("local" as const), busy, add, toggle, remove, clearChecked };
}

/* ── Meals ─────────────────────────────────────────────────────────────── */

/** SIGNAL's recipe library, plus the family's own SIGNAL recipes when signed in. */
export function useRecipes(): Map<string, Recipe> | undefined {
  const library = useLibraryRecipes();
  const mine = useSignal((s) => (s.userId ? s.myRecipes : undefined));
  return useMemo(() => {
    if (!library) return undefined;
    if (!mine?.length) return library;
    const all = new Map<string, Recipe>();
    for (const r of mine) all.set(r.id, r);
    for (const [k, v] of library) all.set(k, v);
    return all;
  }, [library, mine]);
}

function useLibraryRecipes(): Map<string, Recipe> | undefined {
  const [recipes, setRecipes] = useState<Map<string, Recipe>>();
  useEffect(() => {
    let alive = true;
    loadRecipes()
      .then((m) => alive && setRecipes(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return recipes;
}

export interface DayMeal {
  date: Date;
  key: string;
  dinner?: Recipe;
  dinnerId?: string;
  breakfast?: Recipe;
  lunch?: Recipe;
}

export function useWeekMeals(weekStart: Date = startOfWeek()): {
  days: DayMeal[];
  source: "signal" | "sample" | "local" | "none";
  loading: boolean;
} {
  const recipes = useRecipes();
  const picks = useSignal((s) => (s.userId ? s.picks : undefined));
  const showSamples = useHub((s) => s.settings.showSamples);
  const localDinners = useHub((s) => s.localDinners);
  const weekKey = dateKey(weekStart);
  return useMemo(() => {
    const weekStart = fromDateKey(weekKey);
    const days: DayMeal[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return { date, key: dateKey(date) };
    });
    if (!recipes) return { days, source: picks ? "signal" : showSamples ? "sample" : "none", loading: true };
    if (picks) {
      for (const d of days) {
        const p = picks[d.key];
        if (p?.dinner) {
          d.dinnerId = p.dinner;
          d.dinner = recipes.get(p.dinner);
        }
        if (p?.breakfast) d.breakfast = recipes.get(p.breakfast);
        if (p?.lunch) d.lunch = recipes.get(p.lunch);
      }
      return { days, source: "signal", loading: false };
    }
    let any = false;
    days.forEach((d, i) => {
      const chosen = localDinners[d.key] ?? (showSamples ? SAMPLE_DINNERS[i % SAMPLE_DINNERS.length] : undefined);
      if (chosen) {
        any = true;
        d.dinnerId = chosen;
        d.dinner = recipes.get(chosen);
      }
    });
    return { days, source: any ? (showSamples ? "sample" : "local") : "none", loading: false };
  }, [recipes, picks, showSamples, weekKey, localDinners]);
}

export function useTonightsDinner(): DayMeal | undefined {
  const { days } = useWeekMeals();
  const today = dateKey();
  return days.find((d) => d.key === today);
}
