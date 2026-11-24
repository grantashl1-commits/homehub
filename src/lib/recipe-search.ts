/** Searching the dinner picker: SIGNAL's library plus the family's own recipes. */
import type { Recipe } from "./types";

export const RECIPE_KINDS = [
  { id: "all", label: "All" },
  { id: "meal", label: "Dinners" },
  { id: "breakfast", label: "Breakfast" },
  { id: "snack", label: "Snacks & baking" },
  { id: "mine", label: "Our recipes" },
] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number]["id"];

/** Every recipe that matches: name first, then ingredients; the family's own first. */
export function searchRecipes(all: Recipe[], query: string, kind: RecipeKind): Recipe[] {
  const t = query.trim().toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const inKind = all.filter((r) =>
    kind === "all" ? true : kind === "mine" ? r.mine : kind === "snack" ? r.category === "snack" || r.category === "baking" : r.category === kind,
  );
  const score = (r: Recipe): number => {
    if (!words.length) return (r.mine ? 3 : 0) + (r.image ? 1 : 0);
    const name = r.name.toLowerCase();
    if (words.every((w) => name.includes(w))) return 10 + (r.mine ? 3 : 0) + (r.image ? 1 : 0);
    const ing = r.ingredients.join(" ").toLowerCase();
    if (words.every((w) => name.includes(w) || ing.includes(w))) return 5 + (r.mine ? 3 : 0);
    return -1;
  };
  return inKind
    .map((r) => [r, score(r)] as const)
    .filter(([, sc]) => sc >= 0)
    .sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name))
    .map(([r]) => r);
}
