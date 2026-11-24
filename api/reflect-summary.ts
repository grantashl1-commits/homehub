/**
 * POST /api/reflect-summary
 *   { transcript, people: [{ id, name, habit? }] }
 * → { summary, people: { [id]: "what they shared" } }
 *
 * Turns the dinnertime chat transcript (from the screen's speech recognition)
 * into a warm family summary and a few lines for each person, saved to their
 * profile. Uses DeepSeek; needs a family sign-in or the hub key.
 */
import { json } from "./_shared.js";
import { errorResponse, requireFamily } from "./_family.js";
import { deepseekAllowed, deepseekJson } from "./_deepseek.js";

interface Body {
  transcript?: unknown;
  people?: unknown;
}

const SYSTEM = `You help a New Zealand family keep a record of their dinnertime reflection, where everyone shares how their habit went today.
You get a speech-to-text transcript, so expect missing punctuation, misheard words and no speaker labels. Work out who said what from names and context.
Reply with JSON only: {"summary":"2-3 warm sentences about the evening","people":{"<id>":"1-3 sentences in third person about what that person shared: their win or what got in the way, and anything they were proud of or grateful for"}}.
Only include people who actually spoke or were talked about. Never invent details. Use NZ English and a kind, simple tone a child could hear read aloud.`;

export async function POST(request: Request): Promise<Response> {
  const family = await requireFamily(request);
  if (family instanceof Response) return family;
  const blocked = deepseekAllowed(family);
  if (blocked) return json({ error: blocked }, 503);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  const transcript = typeof body.transcript === "string" ? body.transcript.trim().slice(0, 30_000) : "";
  if (transcript.length < 10) return json({ error: "There isn't enough in the recording to summarise." }, 400);
  const people = (Array.isArray(body.people) ? body.people : [])
    .filter((p): p is { id: string; name: string; habit?: string } => !!p && typeof p.id === "string" && typeof p.name === "string")
    .slice(0, 12)
    .map((p) => ({ id: p.id.slice(0, 80), name: p.name.slice(0, 40), habit: typeof p.habit === "string" ? p.habit.slice(0, 80) : undefined }));

  try {
    const out = await deepseekJson<{ summary?: unknown; people?: Record<string, unknown> }>(
      SYSTEM,
      `The family:\n${people.map((p) => `- id "${p.id}": ${p.name}${p.habit ? ` (habit: ${p.habit})` : ""}`).join("\n")}\n\nTranscript:\n${transcript}`,
    );
    const ids = new Set(people.map((p) => p.id));
    const perPerson: Record<string, string> = {};
    for (const [id, text] of Object.entries(out.people ?? {})) {
      if (ids.has(id) && typeof text === "string" && text.trim()) perPerson[id] = text.trim().slice(0, 600);
    }
    return json({ summary: typeof out.summary === "string" ? out.summary.trim().slice(0, 800) : "", people: perPerson });
  } catch (e) {
    return errorResponse(e, "Couldn't summarise the chat");
  }
}
