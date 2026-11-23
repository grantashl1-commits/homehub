/**
 * The New Zealand layer: te reo Māori, school terms, public holidays,
 * "sleeps until…" countdowns and sun-smart reminders.
 *
 * Dates: Ministry of Education term dates (education.govt.nz) and
 * Employment NZ observed public holidays (employment.govt.nz). Term 1 starts
 * and Term 4 ends vary by school; those are marked approximate.
 */
import type { CalendarEvent, Member } from "./types";
import { dateKey, dayPart, fromDateKey } from "./time";

/* ── Te reo Māori ──────────────────────────────────────────────────────── */

export function reoGreeting(d: Date = new Date()): string {
  switch (dayPart(d)) {
    case "morning":
      return "Mōrena";
    case "afternoon":
      return "Kia ora";
    case "evening":
      return "Ahiahi mārie";
    default:
      return "Pō mārie";
  }
}

/** Sunday first, matching Date.getDay(). */
export const REO_DAYS = ["Rātapu", "Rāhina", "Rātū", "Rāapa", "Rāpare", "Rāmere", "Rāhoroi"];

export const REO_MONTHS = [
  "Kohitātea",
  "Huitanguru",
  "Poutūterangi",
  "Paengawhāwhā",
  "Haratua",
  "Pipiri",
  "Hōngongoi",
  "Hereturikōkā",
  "Mahuru",
  "Whiringa-ā-nuku",
  "Whiringa-ā-rangi",
  "Hakihea",
];

export const reoDay = (d: Date) => REO_DAYS[d.getDay()];
export const reoMonth = (d: Date) => REO_MONTHS[d.getMonth()];

/** Little words of praise for celebrations. */
export const PRAISE = ["Ka pai!", "Tino pai!", "Mīharo!", "Ka rawe!"];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

/* ── School terms & public holidays ────────────────────────────────────── */

type NzKind = "public" | "holidays" | "term";

interface NzDate {
  start: string;
  /** Inclusive last day. */
  end?: string;
  title: string;
  emoji: string;
  kind: NzKind;
  approx?: boolean;
}

export const NZ_DATES: NzDate[] = [
  // 2026 (rest of year)
  { start: "2026-12-18", title: "Last day of Term 4 (check your school)", emoji: "🎒", kind: "term", approx: true },
  { start: "2026-12-19", end: "2027-02-02", title: "Summer holidays", emoji: "🏖️", kind: "holidays", approx: true },
  { start: "2026-12-25", title: "Christmas Day", emoji: "🎄", kind: "public" },
  { start: "2026-12-28", title: "Boxing Day (observed)", emoji: "🎁", kind: "public" },
  // 2027
  { start: "2027-01-01", title: "New Year's Day", emoji: "🎆", kind: "public" },
  { start: "2027-01-04", title: "Day after New Year's (observed)", emoji: "🎆", kind: "public" },
  { start: "2027-02-01", title: "Auckland Anniversary Day", emoji: "⛵", kind: "public" },
  { start: "2027-02-03", title: "Term 1 starts (28 Jan – 3 Feb, check your school)", emoji: "🎒", kind: "term", approx: true },
  { start: "2027-02-08", title: "Waitangi Day (observed)", emoji: "🌿", kind: "public" },
  { start: "2027-03-26", title: "Good Friday", emoji: "🐣", kind: "public" },
  { start: "2027-03-29", title: "Easter Monday", emoji: "🐣", kind: "public" },
  { start: "2027-04-09", title: "Last day of Term 1", emoji: "🎒", kind: "term" },
  { start: "2027-04-10", end: "2027-04-26", title: "School holidays", emoji: "🍂", kind: "holidays" },
  { start: "2027-04-26", title: "Anzac Day (observed)", emoji: "🌺", kind: "public" },
  { start: "2027-04-27", title: "Term 2 starts", emoji: "🎒", kind: "term" },
  { start: "2027-06-07", title: "King's Birthday", emoji: "👑", kind: "public" },
  { start: "2027-06-25", title: "Matariki", emoji: "✨", kind: "public" },
  { start: "2027-07-02", title: "Last day of Term 2", emoji: "🎒", kind: "term" },
  { start: "2027-07-03", end: "2027-07-18", title: "School holidays", emoji: "❄️", kind: "holidays" },
  { start: "2027-07-19", title: "Term 3 starts", emoji: "🎒", kind: "term" },
  { start: "2027-09-24", title: "Last day of Term 3", emoji: "🎒", kind: "term" },
  { start: "2027-09-25", end: "2027-10-10", title: "School holidays", emoji: "🌸", kind: "holidays" },
  { start: "2027-10-11", title: "Term 4 starts", emoji: "🎒", kind: "term" },
  { start: "2027-10-25", title: "Labour Day", emoji: "🛠️", kind: "public" },
  { start: "2027-12-17", title: "Last day of Term 4 (check your school)", emoji: "🎒", kind: "term", approx: true },
  { start: "2027-12-18", end: "2028-01-31", title: "Summer holidays", emoji: "🏖️", kind: "holidays", approx: true },
  { start: "2027-12-25", title: "Christmas Day", emoji: "🎄", kind: "public" },
  { start: "2027-12-27", title: "Christmas Day (observed)", emoji: "🎄", kind: "public" },
  { start: "2027-12-28", title: "Boxing Day (observed)", emoji: "🎁", kind: "public" },
];

function nextDayKey(key: string): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

export function nzCalendarEvents(): CalendarEvent[] {
  return NZ_DATES.map((n) => ({
    id: `nz-${n.start}-${n.title}`,
    title: n.title,
    start: n.start,
    end: nextDayKey(n.end ?? n.start),
    allDay: true,
    calendar: "nz" as const,
    emoji: n.emoji,
  }));
}

/* ── Sleeps until… ─────────────────────────────────────────────────────── */

export function sleepsUntil(target: Date, now: Date = new Date()): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(target);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export interface Countdown {
  id: string;
  label: string;
  emoji: string;
  sleeps: number;
  memberId?: string;
}

export function countdowns(members: Member[], now: Date = new Date(), withNzDates = true): Countdown[] {
  const out: Countdown[] = [];
  for (const m of members) {
    if (!m.birthday) continue;
    const [mm, dd] = m.birthday.split("-").map(Number);
    let next = new Date(now.getFullYear(), mm - 1, dd);
    if (sleepsUntil(next, now) < 0) next = new Date(now.getFullYear() + 1, mm - 1, dd);
    out.push({ id: `bday-${m.id}`, label: `${m.name}'s birthday`, emoji: "🎂", sleeps: sleepsUntil(next, now), memberId: m.id });
  }
  if (withNzDates) {
    const hols = NZ_DATES.find((n) => n.kind === "holidays" && sleepsUntil(fromDateKey(n.start), now) >= 0);
    if (hols) out.push({ id: `hols-${hols.start}`, label: hols.title, emoji: hols.emoji, sleeps: sleepsUntil(fromDateKey(hols.start), now) });
    const pub = NZ_DATES.find((n) => n.kind === "public" && sleepsUntil(fromDateKey(n.start), now) >= 0);
    if (pub && !pub.title.startsWith("Christmas"))
      out.push({ id: `pub-${pub.start}`, label: pub.title.replace(/ \(observed\)/, ""), emoji: pub.emoji, sleeps: sleepsUntil(fromDateKey(pub.start), now) });
  }
  let xmas = new Date(now.getFullYear(), 11, 25);
  if (sleepsUntil(xmas, now) < 0) xmas = new Date(now.getFullYear() + 1, 11, 25);
  out.push({ id: "xmas", label: "Christmas", emoji: "🎄", sleeps: sleepsUntil(xmas, now) });
  return out.sort((a, b) => a.sleeps - b.sleeps);
}

export function sleepsLabel(n: number): string {
  if (n === 0) return "Today!";
  if (n === 1) return "1 sleep";
  return `${n} sleeps`;
}

/* ── Sun-smart & what to wear ──────────────────────────────────────────── */

export interface WearTip {
  emoji: string;
  text: string;
  tone: "sun" | "rain" | "cold" | "wind";
}

export function wearTips(w: { uv: number; rainChance: number; low: number; high: number } | undefined): WearTip[] {
  if (!w) return [];
  const tips: WearTip[] = [];
  if (w.uv >= 8) tips.push({ emoji: "🧢", text: `UV ${Math.round(w.uv)}: hats and sunscreen`, tone: "sun" });
  else if (w.uv >= 6) tips.push({ emoji: "🧴", text: `UV ${Math.round(w.uv)}: slip, slop, slap`, tone: "sun" });
  if (w.rainChance >= 60) tips.push({ emoji: "☔", text: "Raincoat day", tone: "rain" });
  if (w.high <= 12) tips.push({ emoji: "🧥", text: "Jersey on, it's chilly", tone: "cold" });
  return tips;
}

/* ── Bin night ─────────────────────────────────────────────────────────── */

/** Is it bin night tonight (evening before collection) or collection morning? */
export function binReminder(
  binDay: number | null | undefined,
  recycling: "weekly" | "even" | "odd" | null | undefined,
  now: Date = new Date(),
): { when: "tonight" | "this morning"; recycling: boolean } | null {
  if (binDay === null || binDay === undefined) return null;
  const h = now.getHours();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  let collection: Date | null = null;
  let when: "tonight" | "this morning" | null = null;
  if (tomorrow.getDay() === binDay && h >= 15) {
    collection = tomorrow;
    when = "tonight";
  } else if (now.getDay() === binDay && h < 9) {
    collection = now;
    when = "this morning";
  }
  if (!collection || !when) return null;
  const week = isoWeek(collection);
  const isRecycling = recycling === "weekly" || (recycling === "even" && week % 2 === 0) || (recycling === "odd" && week % 2 === 1);
  return { when, recycling: isRecycling };
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
