import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./recipe-import";

const PAGE = `<html><head><meta property="og:image" content="https://example.org/beans.jpg"></head><body>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"One-pot Mexican beans and rice",
"recipeIngredient":["1 tbsp olive oil","1 onion, diced","1 cup long-grain rice","400g can black beans"],
"recipeInstructions":[{"@type":"HowToStep","text":"Fry the onion."},{"@type":"HowToStep","text":"Add the rice and beans and simmer."}],
"totalTime":"PT35M","image":"https://example.org/beans-large.jpg"}</script></body></html>`;

const req = (url: string) =>
  new Request("http://localhost/api/recipe-import", { method: "POST", headers: { "x-hub-key": "k", "content-type": "application/json" }, body: JSON.stringify({ url }) });

describe("POST /api/recipe-import", () => {
  let sentToDeepseek = "";
  beforeEach(() => {
    process.env.HUB_ACCESS_KEY = "k";
    process.env.DEEPSEEK_API_KEY = "test";
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const u = input instanceof Request ? input.url : String(input);
      if (u.startsWith("https://api.deepseek.com")) {
        sentToDeepseek = String(init?.body);
        const content = JSON.stringify({
          title: "One-pot Mexican beans and rice",
          category: "Dinner",
          estimated_time: 35,
          serves: 4,
          ingredients: ["1 tbsp olive oil", "1 onion, diced", "1 cup long-grain rice", "400g can black beans, drained"],
          instructions: ["Heat 1 tbsp olive oil in a large pot and fry 1 diced onion for 5 min.", "Stir in 1 cup rice and the 400g can of beans, cover and simmer for 20 min."],
          image_url: null,
        });
        return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
      }
      return new Response(PAGE, { status: 200 });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the page's recipe data and returns a SIGNAL-style method with the amounts in", async () => {
    const res = await POST(req("https://vegansociety.org.nz/one-pot-mexican-beans-and-rice/"));
    expect(res.status).toBe(200);
    const { recipe, via } = (await res.json()) as { recipe: Record<string, unknown>; via: string };
    expect(via).toBe("schema");
    expect(recipe.title).toBe("One-pot Mexican beans and rice");
    expect(recipe.serves).toBe(4);
    expect((recipe.instructions as string[])[0]).toContain("1 tbsp olive oil");
    // DeepSeek gave no photo, so the page's own recipe photo is used.
    expect(recipe.image_url).toBe("https://example.org/beans-large.jpg");
    expect(sentToDeepseek).toContain("Recipe data from the page");
  });

  it("refuses private addresses", async () => {
    const res = await POST(req("http://192.168.1.1/admin"));
    expect(res.status).toBe(400);
  });
});
