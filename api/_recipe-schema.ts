// Reads a recipe from the schema.org data most recipe sites publish in their HTML
// (<script type="application/ld+json"> with "@type": "Recipe"). Search engines use
// it for recipe cards, so it is usually complete and accurate, and reading it needs
// no AI call. Plain TypeScript with no Deno imports, so the app's tests can run it.

export const RECIPE_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Baking", "Other"] as const;
export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

export interface ImportedRecipe {
  title: string;
  category: RecipeCategory;
  estimated_time: number | null;
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  source_url: string;
}

type Json = unknown;
type Obj = Record<string, Json>;
const isObj = (v: Json): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", frac12: "½", frac14: "¼", frac34: "¾", deg: "°" };

/** Decodes HTML entities and strips tags, collapsing whitespace. */
export function cleanText(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

const isRecipe = (o: Obj) => {
  const t = o["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /(^|[:/])recipe$/i.test(x));
};

/** Every Recipe object in a JSON-LD document, however it is nested (@graph, arrays, mainEntity). */
function findRecipes(node: Json, depth = 0, out: Obj[] = []): Obj[] {
  if (depth > 8 || !node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) findRecipes(n, depth + 1, out);
    return out;
  }
  const o = node as Obj;
  if (isRecipe(o)) out.push(o);
  for (const [k, v] of Object.entries(o)) {
    if (k === "@context") continue;
    if (v && typeof v === "object") findRecipes(v, depth + 1, out);
  }
  return out;
}

function strings(v: Json): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  return [];
}

/** Steps from a string, a list of strings, HowToStep, HowToSection or ItemList. */
function steps(v: Json): string[] {
  if (typeof v === "string") {
    // One block of text: split it into lines, then drop "1." style numbering.
    return cleanText(v).split(/\n+/).map((s) => s.replace(/^\s*(step\s*)?\d+[.):]\s*/i, "").trim()).filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap(steps);
  if (isObj(v)) {
    if (v.itemListElement) return steps(v.itemListElement);
    const text = typeof v.text === "string" ? v.text : typeof v.name === "string" ? v.name : "";
    return text ? steps(text) : [];
  }
  return [];
}

/** Minutes from an ISO 8601 duration such as "PT1H15M" or "P0DT45M". */
export function isoMinutes(v: Json): number | null {
  if (typeof v !== "string") return null;
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(v.trim());
  if (!m) return null;
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Number(m[4] ?? 0) / 60;
  return mins > 0 ? Math.round(mins) : null;
}

function image(v: Json): string | null {
  if (typeof v === "string") return /^https?:\/\//i.test(v) ? v : null;
  if (Array.isArray(v)) {
    for (const x of v) { const u = image(x); if (u) return u; }
    return null;
  }
  if (isObj(v)) return image(v.url ?? v.contentUrl);
  return null;
}

/** One of the app's categories, from the site's category and the recipe name. */
export function pickCategory(...hints: string[]): RecipeCategory {
  const h = hints.join(" ").toLowerCase();
  if (/\b(breakfast|brunch|porridge|pancakes?|granola|muesli)\b/.test(h)) return "Breakfast";
  if (/\b(baking|baked goods|cakes?|muffins?|cookies?|biscuits?|slices?|loaf|breads?|scones?|brownies?|desserts?|tarts?)\b/.test(h)) return "Baking";
  if (/\b(snacks?|dips?|bliss balls?|energy balls?|appeti[sz]ers?|finger food)\b/.test(h)) return "Snack";
  if (/\b(lunch|lunchbox|salads?|sandwich(es)?|wraps?|soups?)\b/.test(h)) return "Lunch";
  if (/\b(dinner|mains?|main course|main dish|supper|entr[eé]es?|curry|curries|roast|casserole|stew|pasta|stir[- ]?fry)\b/.test(h)) return "Dinner";
  return "Other";
}

/** The recipe on a page, from its schema.org data, or null when the page has none. */
export function recipeFromHtml(html: string, sourceUrl: string): ImportedRecipe | null {
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  const found: Obj[] = [];
  for (const [, raw] of blocks) {
    const text = raw.replace(/^\s*<!--|-->\s*$/g, "").replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, "").trim();
    try { findRecipes(JSON.parse(text), 0, found); } catch { /* a malformed block: skip it */ }
  }
  for (const r of found) {
    const title = cleanText(strings(r.name)[0] ?? "");
    const ingredients = strings(r.recipeIngredient ?? r.ingredients).map(cleanText).filter(Boolean);
    if (!title || ingredients.length === 0) continue;
    const prepCook = (isoMinutes(r.prepTime) ?? 0) + (isoMinutes(r.cookTime) ?? 0);
    return {
      title,
      category: pickCategory(...strings(r.recipeCategory), ...strings(r.keywords), title),
      estimated_time: isoMinutes(r.totalTime) ?? (prepCook || null),
      ingredients,
      instructions: steps(r.recipeInstructions),
      image_url: image(r.image),
      source_url: sourceUrl,
    };
  }
  return null;
}

/** Tidies a recipe the AI returned into the same shape, or null if it isn't one. */
export function normaliseAiRecipe(v: Json, sourceUrl: string): ImportedRecipe | null {
  if (!isObj(v)) return null;
  const title = cleanText(strings(v.title)[0] ?? "");
  const ingredients = strings(v.ingredients).map(cleanText).filter(Boolean);
  if (!title || ingredients.length === 0) return null;
  const category = RECIPE_CATEGORIES.find((c) => c === v.category) ?? pickCategory(title);
  const time = typeof v.estimated_time === "number" && v.estimated_time > 0 ? Math.round(v.estimated_time) : null;
  return {
    title,
    category,
    estimated_time: time,
    ingredients,
    instructions: strings(v.instructions).map(cleanText).filter(Boolean),
    image_url: image(v.image_url),
    source_url: sourceUrl,
  };
}

/** Whether a link is a public web page worth fetching (not this server or a private network). */
export function isFetchableUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return null;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null;
  if (host.includes(":")) return null; // IPv6 literals
  return u;
}
