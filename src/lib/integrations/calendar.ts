import { useMemo } from "react";
import { useHub } from "../store";
import { sampleEvents } from "../sample";
import { DAY_PART_TIMES, fromDateKey } from "../time";
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
    const planned: CalendarEvent[] = kidPlans
      .filter((p) => !p.addedToCalendar)
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

/**
 * Whose event it is: their name in the title, or one of their own words.
 * "Athletics @ Hilltop" belongs to whoever has "athletics" in their keywords;
 * an event that matches nobody stays in the Family column.
 */
export function eventMembers(e: CalendarEvent, members: Member[], kidPlanMembers?: string[]): string[] {
  if (kidPlanMembers?.length) return kidPlanMembers;
  const title = e.title.toLowerCase();
  return members.filter((m) => memberMatches(m, title)).map((m) => m.id);
}

/** A whole-word name match, or any of the person's keywords anywhere in the title. */
export function memberMatches(m: Member, title: string): boolean {
  const name = m.name.trim().toLowerCase();
  if (name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(title)) return true;
  return (m.keywords ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .some((k) => k.length > 1 && title.includes(k));
}

export function bookingKind(e: CalendarEvent): "clean" | "checkin" | "checkout" | "stay" {
  const t = e.title.toLowerCase();
  if (t.includes("clean")) return "clean";
  if (t.includes("check-in") || t.includes("check in") || t.includes("arriv")) return "checkin";
  if (t.includes("check-out") || t.includes("check out") || t.includes("depart")) return "checkout";
  return "stay";
}
