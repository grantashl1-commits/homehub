import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Recipe } from "./types";
import { searchRecipes } from "./recipe-search";

const library = JSON.parse(readFileSync(new URL("../../public/data/signal-recipes.json", import.meta.url), "utf8")) as Recipe[];

describe("dinner picker search", () => {
  it("finds pancakes, which are breakfast and baking recipes", () => {
    const names = searchRecipes(library, "pancakes", "all").map((r) => r.name);
    expect(names.length).toBeGreaterThanOrEqual(5);
    expect(names).toContain("Banana & Cinnamon Pancakes");
  });

  it("includes recipes without a photo", () => {
    const noPhoto = library.find((r) => !r.image)!;
    expect(searchRecipes(library, noPhoto.name, "all").map((r) => r.id)).toContain(noPhoto.id);
  });

  it("matches on ingredients after names, and puts the family's own first", () => {
    const mine: Recipe = { id: "user:1", name: "One-pot Mexican beans and rice", image: null, ingredients: ["400g black beans"], serves: null, time: null, category: "meal", mine: true };
    const res = searchRecipes([...library, mine], "beans", "all");
    expect(res[0].id).toBe("user:1");
    expect(searchRecipes([...library, mine], "", "mine").map((r) => r.id)).toEqual(["user:1"]);
  });
});
