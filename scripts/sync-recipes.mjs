/**
 * Rebuild `public/data/signal-recipes.json` from the SIGNAL repo next door.
 *
 * Bundles SIGNAL's recipe library and its image resolver with esbuild, then
 * maps each entry to the hub's compact Recipe shape and writes the JSON.
 * `image` is the recipe's own image when present, else SIGNAL's
 * `getRecipeIllustration(name, id)` fallback (specific dish art, then a
 * stand-in of the same kind of dish) — the same image the SIGNAL app shows.
 *
 * Usage:  npm run sync:recipes
 * Needs:  ../signalnz checked out next to this repo.
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SIGNAL = path.resolve(ROOT, "..", "signalnz");
const SIGNAL_SRC = path.join(SIGNAL, "src").replace(/\\/g, "/");
const OUT = path.join(ROOT, "public", "data", "signal-recipes.json");

if (!existsSync(path.join(SIGNAL, "src", "data", "recipe-library.ts"))) {
  console.error(`SIGNAL not found at ${SIGNAL}. Clone it next to homehub (../signalnz).`);
  process.exit(1);
}

const ENTRY = `
import { MERGED_RECIPE_BUILD } from "@/data/recipe-library";
import { getRecipeIllustration } from "@/lib/category-illustrations";

export function buildRecipes() {
  return MERGED_RECIPE_BUILD.recipes.map((r) => ({
    id: r.id,
    name: r.name,
    image: r.image ?? getRecipeIllustration(r.name, r.id),
    ingredients: r.ingredients ?? [],
    serves: typeof r.serves === "number" ? r.serves : null,
    time: r.prepTime ?? r.cookTime ?? null,
    category: r.category ?? null,
  }));
}
`;

async function main() {
  const result = await build({
    stdin: { contents: ENTRY, resolveDir: path.join(SIGNAL, "src"), loader: "ts" },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    target: "es2022",
    alias: { "@": SIGNAL_SRC },
    logLevel: "silent",
  });

  const tmp = path.join(__dirname, ".signal-recipes-bundle.mjs");
  writeFileSync(tmp, result.outputFiles[0].text);
  const mod = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`);
  rmSync(tmp, { force: true });

  const recipes = mod.buildRecipes();
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(recipes));
  console.log(`Wrote ${recipes.length} recipes to ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
