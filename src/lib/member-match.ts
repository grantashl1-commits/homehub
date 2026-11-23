/**
 * Deciding whose calendar event it is.
 *
 * Family calendars are labelled by convention rather than by attendee list:
 * an activity emoji plus 👦 or 👧 for a kid, or a parent's name plus 👨 or 👩.
 * Each person therefore gets a list of "words" — real words or emoji — that
 * mean them, and an event belongs to everyone whose word appears in its title.
 *
 * Kept away from React so it can be unit-tested.
 */
import type { Member } from "./types";

/** Skin tones and emoji presentation selectors vary between keyboards; drop them. */
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/gu;
const PRESENTATION = /[\uFE0E\uFE0F]/gu;

export function plain(s: string): string {
  return s.toLowerCase().replace(SKIN_TONE, "").replace(PRESENTATION, "");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when the title names this person: their name as a whole word, or any of
 * their own words or emoji anywhere in the title.
 */
export function memberMatches(m: Member, title: string): boolean {
  const t = plain(title);
  const name = m.name.trim().toLowerCase();
  if (name && new RegExp(`\\b${escapeRe(name)}\\b`).test(t)) return true;
  return (m.keywords ?? "")
    .split(",")
    .map((k) => plain(k).trim())
    .some((k) => k.length > 0 && (k.length > 1 || !/[a-z0-9]/.test(k)) && t.includes(k));
}

/** Member ids this event belongs to. Nobody matching means it stays in Family. */
export function membersForTitle(title: string, members: Member[]): string[] {
  return members.filter((m) => memberMatches(m, title)).map((m) => m.id);
}
