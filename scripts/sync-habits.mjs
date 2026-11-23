/**
 * Rebuild `public/data/signal-habits.json` from the SIGNAL repo next door.
 *
 * Bundles SIGNAL's `src/data/habit-library.ts` and its art resolver with
 * esbuild, then maps each habit to the hub's compact shape and writes the JSON.
 * `art` is the habit's watercolour illustration path (or null → icon fallback),
 * the same illustration SIGNAL shows via `getHabitArt`.
 *
 * Usage:  npm run sync:habits
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
const OUT = path.join(ROOT, "public", "data", "signal-habits.json");

if (!existsSync(path.join(SIGNAL, "src", "data", "habit-library.ts"))) {
  console.error(`SIGNAL not found at ${SIGNAL}. Clone it next to homehub (../signalnz).`);
  process.exit(1);
}

const ENTRY = `
import { HABIT_LIBRARY } from "@/data/habit-library";
import { getHabitArt } from "@/lib/habit-art";

export function buildHabits() {
  return HABIT_LIBRARY.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    category: h.category,
    frequency: h.frequency,
    art: getHabitArt(h.id) ?? null,
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

  const tmp = path.join(__dirname, ".signal-habits-bundle.mjs");
  writeFileSync(tmp, result.outputFiles[0].text);
  const mod = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`);
  rmSync(tmp, { force: true });

  const habits = mod.buildHabits();
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(habits));
  console.log(`Wrote ${habits.length} habits to ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
