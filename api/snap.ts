/**
 * POST /api/snap  { image: base64 JPEG, today: "YYYY-MM-DD" }
 * Reads a photo of a school newsletter, party invite or sports draw and
 * returns the dated events on it, using DeepSeek's vision. Needs
 * DEEPSEEK_API_KEY (and optionally DEEPSEEK_MODEL) on the Vercel project,
 * plus the x-hub-key header.
 */
import { json, nzToday, requireHubKey } from "./_shared.js";

const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-flash";

interface SnapEvent {
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string | null;
  notes: string | null;
}

const PROMPT = (today: string) => `You read photos of school newsletters, notices, party invitations and sports draws for a family in Taupō, New Zealand.
Today is ${today} (New Zealand time). Dates are written day-first (e.g. 12/3 means 12 March).
Find every event that has a date. If the year is missing, use the next occurrence on or after today.
Reply with JSON only, no other text, in exactly this shape:
{"events":[{"title":"short friendly title","date":"YYYY-MM-DD","start":"HH:MM or null","end":"HH:MM or null","location":"place or null","notes":"one short line of anything to bring or remember, or null"}]}
Use 24-hour times. If there are no dated events, reply {"events":[]}.`;

function clean(e: Partial<SnapEvent>): SnapEvent | null {
  if (!e.title || !e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return null;
  const time = (t: unknown) => (typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t) ? t.padStart(5, "0") : null);
  return {
    title: String(e.title).slice(0, 80),
    date: e.date,
    start: time(e.start),
    end: time(e.end),
    location: e.location ? String(e.location).slice(0, 80) : null,
    notes: e.notes ? String(e.notes).slice(0, 140) : null,
  };
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireHubKey(request);
  if (denied) return denied;
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json({ error: "DEEPSEEK_API_KEY isn't set on the Vercel project yet." }, 503);

  let body: { image?: string; mediaType?: string; today?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  const image = body.image?.replace(/^data:[^,]+,/, "");
  if (!image || image.length > 6_000_000) return json({ error: "Send one photo under about 4MB" }, 400);
  const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(body.mediaType ?? "") ? body.mediaType! : "image/jpeg";
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today ?? "") ? body.today! : nzToday();

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
            { type: "text", text: PROMPT(today) },
          ],
        },
      ],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) return json({ error: data.error?.message ?? `The reader said ${res.status}` }, 502);

  const text = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(match ? match[0] : text) as { events?: Partial<SnapEvent>[] };
    const events = (parsed.events ?? []).map(clean).filter((e): e is SnapEvent => !!e).slice(0, 20);
    return json({ events });
  } catch {
    return json({ error: "Couldn't read any dates from that photo. Try a clearer, closer shot." }, 422);
  }
}
