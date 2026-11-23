/**
 * Pure iCal parsing: turns an ICS string into the hub's flat event list.
 * Extracted from api/calendar.ts so it can be unit-tested.
 */
import ICAL from "ical.js";

export type Feed = "family" | "bookings" | "kids";

export interface HubEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  calendar: Feed;
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
