/**
 * A link that opens Google Calendar's "new event" page already filled in:
 * title, date, start and end time, location and notes. The hub reads Google
 * through the private iCal link, which is read-only, so this is how an event
 * made on the hub gets into Google: one tap, then Save in Google.
 */
import type { KidPlan } from "./types";
import { DAY_PART_TIMES, fromDateKey } from "./time";

export function googleTemplateUrl(p: Pick<KidPlan, "title" | "emoji" | "date" | "part" | "time" | "endTime" | "location" | "notes" | "createdBy">): string {
  const start = fromDateKey(p.date);
  const [h, m] = (p.time ?? `${DAY_PART_TIMES[p.part].hour}:00`).split(":").map(Number);
  start.setHours(h, m || 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60000);
  if (p.endTime) {
    const [eh, em] = p.endTime.split(":").map(Number);
    const e = new Date(start);
    e.setHours(eh, em || 0, 0, 0);
    if (e > start) end.setTime(e.getTime());
  }
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const from = p.createdBy === "snap" ? "Read off a notice by Home Hub" : "Added on Home Hub";
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${p.emoji} ${p.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: p.notes ? `${p.notes}\n\n${from}` : from,
    ctz: "Pacific/Auckland",
    ...(p.location ? { location: p.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
