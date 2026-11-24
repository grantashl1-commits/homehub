/**
 * POST /api/recipe-import  { url }
 * → { recipe: { title, category, estimated_time, serves, ingredients[], instructions[], image_url, source_url } }
 *
 * Reads a recipe off a web page and writes it up the SIGNAL way: ingredients
 * with amounts, and short method steps that say the amounts as you go
 * ("Fry 1 diced onion in 1 tbsp oil…"), so nobody has to scroll back up.
 *
 * 1. The page's own schema.org recipe data, when it has it (most recipe sites).
 * 2. Otherwise the page text.
 * Either way DeepSeek then writes the SIGNAL-style method. The browser saves
 * the result to the family's SIGNAL "My recipes" under SIGNAL's own RLS.
 * Uses SIGNAL's page reader (api/_recipe-schema.ts, copied from signalnz).
 */
import { json } from "./_shared.js";
import { errorResponse, requireFamily } from "./_family.js";
import { deepseekAllowed, deepseekJson } from "./_deepseek.js";
import { RECIPE_CATEGORIES, cleanText, isFetchableUrl, normaliseAiRecipe, recipeFromHtml, type ImportedRecipe } from "./_recipe-schema.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(url: URL): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "accept-language": "en-NZ,en;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    // A redirect must not land somewhere private either.
    if (!res.ok || !isFetchableUrl(res.url || url.toString())) return null;
    return (await res.text()).slice(0, 3_000_000);
  } catch {
    return null;
  }
}

/**
 * The page's readable text via Jina Reader, for sites that refuse requests
 * from cloud servers (the same fallback SIGNAL's recipe-from-url uses).
 */
async function fetchViaReader(url: URL): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url.toString()}`, {
      headers: { "user-agent": UA, accept: "text/plain" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}

function pageText(html: string): string {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(nav|footer|header|aside)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n"),
  );
}

function ogImage(html: string): string | null {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m && /^https:\/\//.test(m[1]) ? m[1] : null;
}

const SYSTEM = `You write recipes for SIGNAL, a New Zealand family nutrition app.
Reply with one JSON object only:
{"title": string, "category": ${RECIPE_CATEGORIES.map((c) => `"${c}"`).join(" | ")}, "estimated_time": total minutes as a number or null, "serves": number or null,
 "ingredients": [string], "instructions": [string], "image_url": string or null}
Rules:
- Ingredients: one per line, amount first, metric where the page gives a choice, NZ names (capsicum, coriander, courgette, kūmara where it fits). e.g. "400g can black beans, drained and rinsed".
- Instructions: short imperative steps in SIGNAL style that include the amounts as you go, so the cook never has to look back at the ingredient list. e.g. "Heat 1 tbsp olive oil in a large pot. Add 1 diced onion and 2 crushed garlic cloves and cook for 3 min." Keep 4 to 9 steps.
- Don't invent ingredients or steps that aren't on the page. Keep the cook's quantities.
- image_url: the recipe's main photo (a full https image link from the page), or null.
- If there is no recipe, reply {"error": "No recipe found on this page"}.`;

export async function POST(request: Request): Promise<Response> {
  const family = await requireFamily(request);
  if (family instanceof Response) return family;
  const blocked = deepseekAllowed(family);
  if (blocked) return json({ error: blocked }, 503);

  let raw: unknown;
  try {
    raw = ((await request.json()) as { url?: unknown }).url;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  const link = typeof raw === "string" ? raw.trim() : "";
  const url = isFetchableUrl(/^[a-z]+:\/\//i.test(link) ? link : `https://${link}`);
  if (!url) return json({ error: "That doesn't look like a web link. Copy the full address of the recipe page." }, 400);

  const html = await fetchPage(url);
  const fromSchema = html ? recipeFromHtml(html, url.toString()) : null;
  // No recipe data on the page, or the site refused us: read it through Jina Reader instead.
  const readerText = fromSchema ? null : (html ? null : await fetchViaReader(url));
  if (!html && !readerText) return json({ error: "That site wouldn't let us read the page, even through a reader. Try another link." }, 422);
  const source = fromSchema
    ? `Recipe data from the page:\n${JSON.stringify(fromSchema)}`
    : readerText
      ? `Page text (with image links):\n${readerText.slice(0, 16_000)}`
      : `Page text:\n${pageText(html!).slice(0, 14_000)}`;
  if (!fromSchema && source.length < 300) return json({ error: "There isn't a recipe on that page we can read." }, 422);

  try {
    const out = await deepseekJson<Record<string, unknown>>(SYSTEM, `${source}\n\nWrite this recipe up for SIGNAL.`, 3000);
    if (typeof out.error === "string") return json({ error: "No recipe found on that page. Try a link to a single recipe." }, 422);
    const recipe: (ImportedRecipe & { serves: number | null }) | null = (() => {
      const r = normaliseAiRecipe(out, url.toString());
      if (!r) return null;
      const serves = typeof out.serves === "number" && out.serves > 0 && out.serves < 50 ? Math.round(out.serves) : null;
      return { ...r, serves };
    })();
    if (!recipe) return json({ error: "We couldn't pick a recipe out of that page." }, 422);
    recipe.image_url ??= fromSchema?.image_url ?? (html ? ogImage(html) : null);
    return json({ recipe, via: fromSchema ? "schema" : readerText ? "reader" : "text" });
  } catch (e) {
    return errorResponse(e, "Couldn't read that recipe");
  }
}
