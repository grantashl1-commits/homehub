/**
 * GET /api/calendar → the family's Google Calendar events for the next five
 * weeks, read from the private iCal links kept in Vercel env vars:
 *   FAMILY_ICAL_URL   (required) family calendar
 *   BOOKINGS_ICAL_URL (optional) Airbnb bookings and cleans
 *   KIDS_ICAL_URL     (optional) the kids' calendar
 * The links never reach the browser. Requires the x-hub-key header.
 */
import { json, requireHubKey } from "./_shared.js";
import { parseIcs, type Feed, type HubEvent } from "./parse-ics.js";

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; events: HubEvent[] }>();

function feeds(): { feed: Feed; url: string }[] {
  const list: { feed: Feed; url: string | undefined }[] = [
    { feed: "family", url: process.env.FAMILY_ICAL_URL },
    { feed: "bookings", url: process.env.BOOKINGS_ICAL_URL },
    { feed: "kids", url: process.env.KIDS_ICAL_URL },
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
  const denied = requireHubKey(request);
  if (denied) return denied;
  const list = feeds();
  if (!list.length) return json({ error: "FAMILY_ICAL_URL isn't set on the Vercel project yet." }, 503);

  const from = new Date(Date.now() - 36 * 3600_000);
  const to = new Date(Date.now() + 35 * 86400_000);
  const results = await Promise.allSettled(list.map((f) => load(f.feed, f.url, from, to)));
  const events = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? list[i].feed : null))
    .filter(Boolean);
  if (failed.length === list.length) {
    return json({ error: "Couldn't read the calendar link. Check FAMILY_ICAL_URL." }, 502);
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return json({ events: events.slice(0, 600), feeds: list.map((f) => f.feed), failed, fetchedAt: new Date().toISOString() });
}
