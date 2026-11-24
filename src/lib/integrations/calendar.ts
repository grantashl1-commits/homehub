import { useMemo } from "react";
import { membersForTitle } from "../member-match";
import { useHub } from "../store";
import { sampleEvents } from "../sample";
import { DAY_PART_TIMES, dateKey, fromDateKey } from "../time";
import { nzCalendarEvents } from "../nz";
import type { CalendarEvent, Member } from "../types";
import { useRemote } from "../useRemote";
import { cacheKey, hubFetch } from "./hub-api";
import { useHubAccess } from "../account";

interface CalendarResponse {
  events: CalendarEvent[];
  feeds: string[];
  fetchedAt: string;
}

/**
 * Family calendar (Google, via the private iCal link held server-side), plus
 * events the kids added on the hub. Falls back to sample events when the
 * calendar isn't connected yet and samples are switched on.
 */
export function useCalendar() {
  const access = useHubAccess();
  const showSamples = useHub((s) => s.settings.showSamples);
  const kidPlans = useHub((s) => s.kidPlans);
  const nzDates = useHub((s) => s.settings.nzDates);
  const remote = useRemote<CalendarResponse>(
    access ? cacheKey("calendar", access) : null,
    () => hubFetch<CalendarResponse>("/api/calendar"),
    { intervalMs: 5 * 60_000 },
  );

  const events = useMemo(() => {
    const base: CalendarEvent[] = remote.data?.events ?? (showSamples ? sampleEvents() : []);
    // Keep showing a plan sent to Google until Google's own feed has it (the
    // private iCal link can lag behind by a few hours).
    const strip = (t: string) => t.replace(/[^\p{L}\p{N} ]/gu, "").trim().toLowerCase();
    const inFeed = (p: (typeof kidPlans)[number]) =>
      base.some((e) => dateKey(eventStart(e)) <= p.date && dateKey(eventEnd(e)) >= p.date && strip(e.title).includes(strip(p.title)));
    const planned: CalendarEvent[] = kidPlans
      .filter((p) => !p.addedToCalendar || (p.date >= dateKey(new Date()) && !inFeed(p)))
      .map((p) => {
        const start = fromDateKey(p.date);
        const [sh, sm] = (p.time ?? `${DAY_PART_TIMES[p.part].hour}:00`).split(":").map(Number);
        start.setHours(sh, sm || 0, 0, 0);
        const end = new Date(start);
        if (p.endTime) {
          const [eh, em] = p.endTime.split(":").map(Number);
          end.setHours(eh, em || 0, 0, 0);
        } else end.setTime(start.getTime() + 60 * 60000);
        return {
          id: `plan-${p.id}`,
          title: p.title,
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          calendar: "hub" as const,
          kidPlanId: p.id,
          emoji: p.emoji,
          location: p.location,
        };
      });
    const nz = nzDates ? nzCalendarEvents() : [];
    return [...base, ...planned, ...nz].sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());
  }, [remote.data, showSamples, kidPlans, nzDates]);

  return {
    events,
    connected: !!remote.data,
    usingSamples: !remote.data && showSamples,
    error: access ? remote.error : undefined,
    stale: remote.stale,
    refresh: remote.refresh,
  };
}

export function eventStart(e: CalendarEvent): Date {
  return e.allDay ? fromDateKey(e.start.slice(0, 10)) : new Date(e.start);
}

export function eventEnd(e: CalendarEvent): Date {
  return e.allDay ? fromDateKey(e.end.slice(0, 10)) : new Date(e.end);
}

/** Does this event fall on the given local day? */
export function onDay(e: CalendarEvent, day: Date): boolean {
  const s = eventStart(e);
  const en = eventEnd(e);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  if (e.allDay) return s < dayEnd && en > dayStart;
  return s >= dayStart && s < dayEnd;
}

/** Whose event it is, using the names and words each person has been given. */
export function eventMembers(e: CalendarEvent, members: Member[], kidPlanMembers?: string[]): string[] {
  if (kidPlanMembers?.length) return kidPlanMembers;
  return membersForTitle(e.title, members);
}

export function bookingKind(e: CalendarEvent): "clean" | "checkin" | "checkout" | "stay" {
  const t = e.title.toLowerCase();
  if (t.includes("clean")) return "clean";
  if (t.includes("check-in") || t.includes("check in") || t.includes("arriv")) return "checkin";
  if (t.includes("check-out") || t.includes("check out") || t.includes("depart")) return "checkout";
  return "stay";
}

/* ── Tasks ─────────────────────────────────────────────────────────────── */

const TASK_PREFIX = /^\s*(?:(?:to[\s-]?do|task)\s*[:\-–—]\s*|☐\s*|\[\s?\]\s*)/i;

/**
 * Is this calendar entry a task rather than an appointment? Google's private
 * calendar link doesn't include Google Tasks, so a task is anything titled
 * "To do: …" / "Task: …" / "☐ …", or an all-day entry on the family or kids'
 * calendar (not school terms, holidays or bookings).
 */
export function isTask(e: CalendarEvent): boolean {
  if (TASK_PREFIX.test(e.title)) return true;
  return e.allDay && (e.calendar === "family" || e.calendar === "kids");
}

/** The task's wording without the "To do:" prefix. */
export function taskTitle(e: CalendarEvent): string {
  return e.title.replace(TASK_PREFIX, "").trim() || e.title;
}
