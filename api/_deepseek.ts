/**
 * DeepSeek chat completions (OpenAI-compatible) for the hub's text jobs:
 * summarising the dinnertime chat and reading recipes off web pages.
 * Needs DEEPSEEK_API_KEY on the Vercel project; DEEPSEEK_MODEL is optional.
 * It's the hub's key, so only the home family uses it unless
 * DEEPSEEK_FOR_ALL_FAMILIES=true.
 */
import type { Family } from "./_family.js";

export function deepseekAllowed(f: Family): string | null {
  if (!process.env.DEEPSEEK_API_KEY) return "DEEPSEEK_API_KEY isn't set on the Vercel project yet.";
  if (!f.isHome && process.env.DEEPSEEK_FOR_ALL_FAMILIES !== "true") return "This isn't switched on for your family yet.";
  return null;
}

/** Ask for a JSON answer. Throws with a readable message on failure. */
export async function deepseekJson<T>(system: string, user: string, maxTokens = 2000): Promise<T> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) throw Object.assign(new Error(data.error?.message ?? `DeepSeek said ${res.status}`), { status: 502 });
  const text = data.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text) as T;
  } catch {
    throw Object.assign(new Error("DeepSeek's answer wasn't readable. Try again."), { status: 502 });
  }
}
