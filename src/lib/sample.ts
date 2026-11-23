/**
 * Sample data so the hub looks alive before anything is connected.
 * Turn it off in Parent → Settings → "Show sample data".
 */
import type { CalendarEvent, Chore, Habit, ListItem, PostIt } from "./types";
import { addDays, dateKey } from "./time";

export const SAMPLE_CHORES: Chore[] = [
  { id: "c-bed", name: "Make my bed", icon: "make-bed.png", points: 1, memberIds: null, recurrence: "daily" },
  { id: "c-teeth", name: "Brush my teeth", icon: "brushteeth-morning-bed.png", points: 1, memberIds: null, recurrence: "daily" },
  { id: "c-table", name: "Set the table", icon: "set-the-table.png", points: 2, memberIds: null, recurrence: "daily" },
  { id: "c-pets", name: "Feed the dog", icon: "fed-pets.png", points: 2, memberIds: null, recurrence: "daily" },
  { id: "c-toys", name: "Put toys away", icon: "put-things-away.png", points: 1, memberIds: null, recurrence: "daily" },
  { id: "c-bag", name: "Pack my bag", icon: "packed-bag.png", points: 1, memberIds: null, recurrence: "daily" },
];

export const SAMPLE_HABITS = (): Habit[] => [
  { id: "h-mum", memberId: "mum", title: "Phone-free dinner", icon: "adult-no-phone.png", frequency: { kind: "daily" }, startDate: dateKey(addDays(new Date(), -5)), active: true },
  { id: "h-dad", memberId: "dad", title: "Move for 30 minutes", icon: "adult-exercised-30min.png", frequency: { kind: "weekdays" }, startDate: dateKey(addDays(new Date(), -5)), active: true },
  { id: "h-kid1", memberId: "kid1", title: "Brush my teeth", icon: "brushteeth-night-bed.png", frequency: { kind: "daily" }, startDate: dateKey(addDays(new Date(), -5)), active: true },
  { id: "h-kid2", memberId: "kid2", title: "Read a book", icon: "journalling.png", frequency: { kind: "daily" }, startDate: dateKey(addDays(new Date(), -5)), active: true },
];

export const SAMPLE_LIST = (): ListItem[] => {
  const now = Date.now();
  return [
    { id: "s1", name: "Milk", category: "dairy", checked: false, addedBy: "kid1", createdAt: now - 1000 },
    { id: "s2", name: "Bananas", category: "produce", checked: false, addedBy: "kid2", createdAt: now - 2000 },
    { id: "s3", name: "Bread", category: "pantry", checked: false, addedBy: "mum", createdAt: now - 3000 },
    { id: "s4", name: "Chicken thighs", category: "protein", checked: false, addedBy: "mum", recipe: "Mild Chicken Curry", createdAt: now - 4000 },
    { id: "s5", name: "Toothpaste", category: "other", checked: false, addedBy: "dad", createdAt: now - 5000 },
    { id: "s6", name: "Strawberries", category: "produce", checked: true, addedBy: "kid1", createdAt: now - 6000 },
  ];
};

export const SAMPLE_NOTES = (): PostIt[] => {
  const now = Date.now();
  return [
    {
      id: "n1",
      from: "mum",
      to: "kid1",
      kind: "text",
      text: "Proud of you for helping Pip today! 💛",
      color: "sun",
      sticker: "⭐",
      rotation: -2.2,
      createdAt: now - 1000 * 60 * 40,
      seenBy: ["mum"],
      reactions: {},
    },
    {
      id: "n2",
      from: "kid2",
      to: "everyone",
      kind: "text",
      text: "Can we have tacos on Friday??",
      color: "sky",
      sticker: "🌮",
      rotation: 1.8,
      createdAt: now - 1000 * 60 * 90,
      seenBy: ["kid2", "mum"],
      reactions: { "❤️": ["mum"] },
    },
    {
      id: "n3",
      from: "dad",
      to: "mum",
      kind: "text",
      text: "Grabbed the milk. Swim bags are in the car.",
      color: "sage",
      rotation: -1,
      createdAt: now - 1000 * 60 * 180,
      seenBy: ["dad"],
      reactions: {},
    },
  ];
};

/** Recipe ids from SIGNAL's library, used for the sample week of dinners. */
export const SAMPLE_DINNERS = [
  "dinner-beef-bolognese",
  "dinner-chicken-lemon-herb",
  "black-bean-tacos",
  "dinner-chicken-curry",
  "dinner-salmon-couscous",
  "dinner-chicken-stirfry",
  "dinner-mushroom-lentil-shepherds-pie",
];

export function sampleEvents(): CalendarEvent[] {
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = addDays(new Date(), dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const ev = (
    id: string,
    title: string,
    dayOffset: number,
    h: number,
    m: number,
    durMins: number,
    calendar: CalendarEvent["calendar"] = "family",
  ): CalendarEvent => {
    const start = at(dayOffset, h, m);
    const end = new Date(start.getTime() + durMins * 60000);
    return { id, title, start: start.toISOString(), end: end.toISOString(), allDay: false, calendar, sample: true };
  };
  return [
    ev("e1", "Swimming lesson – Sunny", 0, 15, 30, 45),
    ev("e2", "Pip – school assembly", 0, 9, 0, 60),
    ev("e3", "Family dinner at Nana's", 0, 18, 0, 120),
    ev("e4", "Clean – One Eleven", 1, 10, 0, 180, "bookings"),
    ev("e5", "Guest check-in", 1, 15, 0, 30, "bookings"),
    ev("e6", "Dad – football training", 1, 17, 30, 90),
    ev("e7", "Mum – Mindcast session", 2, 19, 0, 60),
    ev("e8", "Library day", 3, 10, 0, 60),
    ev("e9", "Sunny – birthday party", 5, 13, 0, 120),
    {
      id: "e10",
      title: "Teacher only day",
      start: dateKey(addDays(new Date(), 4)),
      end: dateKey(addDays(new Date(), 5)),
      allDay: true,
      calendar: "family",
      sample: true,
    },
  ];
}
