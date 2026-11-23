/**
 * GET /api/calendar → the family's Google Calendar events for the next five
 * weeks, read from the private iCal links kept in Vercel env vars:
 *   FAMILY_ICAL_URL   (required) family calendar
 *   BOOKINGS_ICAL_URL (optional) Airbnb bookings and cleans
 *   KIDS_ICAL_URL     (optional) the kids' calendar
 * Each family's own links are saved in Parent → Connections (household_secrets);
 * the home family can also use the Vercel env vars above. The links never
 * reach the browser. Requires a family sign-in or the x-hub-key header.
 */
import { json } from "./_shared.js";
import { requireFamily, type Family } from "./_family.js";
import { parseIcs, type Feed, type HubEvent } from "./parse-ics.js";

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; events: HubEvent[] }>();

async function feeds(f: Family): Promise<{ feed: Feed; url: string }[]> {
  const list: { feed: Feed; url: string | undefined }[] = [
    { feed: "family", url: await f.secret("FAMILY_ICAL_URL") },
    { feed: "bookings", url: await f.secret("BOOKINGS_ICAL_URL") },
    { feed: "kids", url: await f.secret("KIDS_ICAL_URL") },
  ];
  return list
    .filter((f): f is { feed: Feed; url: string } => !!f.url)
    .map((f) => ({ feed: f.feed, url: f.url.replace(/^webcal:\/\//i, "https://") }));
}


async function load(feed: Feed, url: string, from: Date, to: Date): Promise<HubEvent[]> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.events;
  const res = await fetch(url, { headers: { accept: "text/calendar" } });
  if (!res.ok) throw new Error(`The ${feed} calendar link returned ${res.status}.`);
  const events = parseIcs(await res.text(), feed, from, to);
  cache.set(url, { at: Date.now(), events });
  return events;
}

export async function GET(request: Request): Promise<Response> {
  const family = await requireFamily(request);
  if (family instanceof Response) return family;
  let list: { feed: Feed; url: string }[];
  try {
    list = await feeds(family);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't load the calendar links." }, 502);
  }
  if (!list.length) return json({ error: "No family calendar linked yet. Add it in Parent → Connections." }, 503);

  const from = new Date(Date.now() - 36 * 3600_000);
  const to = new Date(Date.now() + 35 * 86400_000);
  const results = await Promise.allSettled(list.map((f) => load(f.feed, f.url, from, to)));
  const events = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? list[i].feed : null))
    .filter(Boolean);
  if (failed.length === list.length) {
    return json({ error: "Couldn't read the calendar link. Check it in Parent → Connections." }, 502);
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return json({ events: events.slice(0, 600), feeds: list.map((f) => f.feed), failed, fetchedAt: new Date().toISOString() });
}
