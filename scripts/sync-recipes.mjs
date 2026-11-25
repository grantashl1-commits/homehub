// Rebuilds the cooking methods in public/data/signal-recipes.json from the
// SIGNAL recipe library (../signalnz). SIGNAL is the source of truth for the
// recipes; the hub ships a snapshot. The original snapshot dropped `method`,
// so this script re-reads each recipe's method (keyed by id) and adds it,
// leaving every other field untouched.
//
// Usage: npm run sync:recipes
// Requires ../signalnz checked out (read-only reference).
import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const signalSrc = join(root, "..", "signalnz", "src");
const jsonPath = join(root, "public", "data", "signal-recipes.json");

if (!existsSync(signalSrc)) {
  console.error(`Can't find the SIGNAL source at ${signalSrc}.`);
  console.error("Clone it next to this repo: git clone https://github.com/grantashl1-commits/signalnz ../signalnz");
  process.exit(1);
}

// Only the one-off sources that actually feed signal-recipes.json. The kids
// and family banks use different types (and image imports) and aren't in the
// snapshot, so they're left out on purpose.
const sources = [
  ["RECIPES", "meal-plans"],
  ["BAKING_RECIPES", "baking-recipes"],
  ["BOWL_MEAL_RECIPES", "bowl-meal-recipes"],
  ["DOCTORS_KITCHEN_RECIPES", "doctors-kitchen-recipes"],
  ["EXTRA_BATCH_MEAL_RECIPES", "extra-batch-recipes"],
  ["GLUCOSE_REVOLUTION_RECIPES", "glucose-revolution-recipes"],
  ["HOW_NOT_TO_DIET_RECIPES", "how-not-to-diet-recipes"],
  ["MEAL_PLAN_RECIPES", "meal-plan-recipes"],
  ["NOURISH_RECIPES", "nourish-recipes"],
  ["EXPANDED_RECIPES", "pdf-expanded-recipes"],
  ["LIBRARY_RECIPES", "pdf-library-recipes"],
  ["PDF_RECIPES", "pdf-recipes"],
  ["PLANT_POWERED_PLUS_RECIPES", "plant-powered-plus-recipes"],
  ["PLANT_POWERED_RECIPES", "plant-powered-recipes"],
  ["PROTEIN_15_RECIPES", "protein-15-recipes"],
  ["SNACK_DESSERT_RECIPES", "snack-dessert-recipes"],
  ["STORAGE_PDF_RECIPES", "storage-pdf-recipes"],
  ["TCM_AYURVEDA_RECIPES", "tcm-ayurveda-recipes"],
  ["VEGAN_BASICS_RECIPES", "vegan-basics-recipes"],
];

const entry = sources
  .map(([name, file]) => `export { ${name} } from "../signalnz/src/data/${file}";`)
  .join("\n");

const bundle = join(root, "scripts", ".recipes.bundle.mjs");

await build({
  stdin: { contents: entry, loader: "ts", resolveDir: root },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: bundle,
  alias: { "@": signalSrc },
  logLevel: "warning",
});

try {
  const mod = await import(pathToFileURL(bundle).href + "?t=" + Date.now());

  const methods = new Map();
  for (const arr of Object.values(mod)) {
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      if (r && typeof r.id === "string" && Array.isArray(r.method) && r.method.length) {
        methods.set(r.id, r.method.filter((s) => typeof s === "string" && s.trim()));
      }
    }
  }

  const recipes = JSON.parse(readFileSync(jsonPath, "utf8"));
  let added = 0;
  for (const r of recipes) {
    const m = methods.get(r.id);
    if (m?.length) {
      r.method = m;
      added++;
    }
  }

  writeFileSync(jsonPath, JSON.stringify(recipes));
  console.log(`signal-recipes.json: added a method to ${added} of ${recipes.length} recipes (${methods.size} methods found in SIGNAL).`);
} finally {
  try {
    unlinkSync(bundle);
  } catch {
    /* ignore */
  }
}
