import type { DayPart } from "./types";

/** Local calendar date as YYYY-MM-DD (device time, NZ on the bench). */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfWeek(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - dow);
  return out;
}

/** ISO week key used by SIGNAL's shopping list, e.g. "2026-W48". */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function dayPart(d: Date = new Date()): "morning" | "afternoon" | "evening" | "night" {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

export function greeting(d: Date = new Date()): string {
  switch (dayPart(d)) {
    case "morning":
      return "Good morning";
    case "afternoon":
      return "Good afternoon";
    case "evening":
      return "Good evening";
    default:
      return "Hello, night owls";
  }
}

const TIME = new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-NZ", { weekday: "long" });
const DAY_SHORT = new Intl.DateTimeFormat("en-NZ", { weekday: "short" });
const DATE_LONG = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long" });
const DATE_SHORT = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short" });

export function formatTime(d: Date): string {
  return TIME.format(d).replace(/\s?(am|pm)/i, (m) => m.trim().toLowerCase());
}
export const formatDay = (d: Date) => DAY.format(d);
export const formatDayShort = (d: Date) => DAY_SHORT.format(d);
export const formatDateLong = (d: Date) => DATE_LONG.format(d);
export const formatDateShort = (d: Date) => DATE_SHORT.format(d);

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function relativeDayLabel(d: Date, now: Date = new Date()): string {
  const diff = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return formatDay(d);
  return formatDateLong(d);
}

export const DAY_PART_TIMES: Record<DayPart, { hour: number; label: string; emoji: string }> = {
  morning: { hour: 9, label: "Morning", emoji: "🌅" },
  afternoon: { hour: 14, label: "Afternoon", emoji: "☀️" },
  evening: { hour: 18, label: "Evening", emoji: "🌙" },
};

export function minutesSince(ts: number): number {
  return Math.floor((Date.now() - ts) / 60000);
}

export function timeAgo(ts: number): string {
  const m = minutesSince(ts);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
