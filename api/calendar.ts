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
import ICAL from "ical.js";
import { json } from "./_shared.js";
import { requireFamily, type Family } from "./_family.js";

type Feed = "family" | "bookings" | "kids";

interface HubEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  calendar: Feed;
}

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

function dateOnly(t: ICAL.Time): string {
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

function toOut(feed: Feed, uid: string, summary: string, location: string | undefined, start: ICAL.Time, end: ICAL.Time): HubEvent {
  const allDay = start.isDate;
  return {
    id: `${feed}:${uid}:${start.toString()}`,
    title: summary || "(No title)",
    start: allDay ? dateOnly(start) : start.toJSDate().toISOString(),
    end: allDay ? dateOnly(end) : end.toJSDate().toISOString(),
    allDay,
    location: location || undefined,
    calendar: feed,
  };
}

export function parseIcs(text: string, feed: Feed, from: Date, to: Date): HubEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {
      /* already registered */
    }
  }
  const rangeStart = ICAL.Time.fromJSDate(from, true);
  const rangeEnd = ICAL.Time.fromJSDate(to, true);

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const v of root.getAllSubcomponents("vevent")) {
    if (String(v.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") continue;
    const ev = new ICAL.Event(v);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
    else masters.set(`${ex.uid}:${ex.recurrenceId?.toString()}`, ex);
  }

  const out: HubEvent[] = [];
  for (const ev of masters.values()) {
    if (ev.isRecurring()) {
      const it = ev.iterator();
      let next: ICAL.Time | null;
      let guard = 0;
      while ((next = it.next()) && guard++ < 5000) {
        if (next.compare(rangeEnd) > 0) break;
        const d = ev.getOccurrenceDetails(next);
        if (d.endDate.compare(rangeStart) <= 0) continue;
        if (String(d.item.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") continue;
        out.push(toOut(feed, ev.uid, d.item.summary, d.item.location, d.startDate, d.endDate));
      }
    } else {
      const end = ev.endDate ?? ev.startDate;
      if (ev.startDate.compare(rangeEnd) > 0 || end.compare(rangeStart) <= 0) continue;
      out.push(toOut(feed, ev.uid, ev.summary, ev.location, ev.startDate, end));
    }
  }
  return out;
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
