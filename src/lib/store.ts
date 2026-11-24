/**
 * The hub's own state, kept on the device (local-first) so the bench screen
 * works instantly and offline. SIGNAL, PointPals, Google Calendar and Notion
 * stay the source of truth for their own data; see src/lib/integrations.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "./device";
import { dateKey } from "./time";
import type {
  CheckIn,
  CheckInStatus,
  FamilyReflection,
  Chore,
  Claim,
  Habit,
  KidPlan,
  ListItem,
  Member,
  Photo,
  PostIt,
  ReflectionNight,
  Settings,
} from "./types";
import { SAMPLE_CHORES, SAMPLE_HABITS, SAMPLE_LIST, SAMPLE_NOTES } from "./sample";

export const DEFAULT_MEMBERS: Member[] = [
  { id: "mum", name: "Mum", role: "parent", palId: "marlow" },
  { id: "dad", name: "Dad", role: "parent", palId: "ridge" },
  { id: "kid1", name: "Sunny", role: "child", palId: "sunny" },
  { id: "kid2", name: "Pip", role: "child", palId: "pip" },
];

const DEFAULT_SETTINGS: Settings = {
  familyName: "Our Family",
  setupDone: false,
  nightStart: 21,
  nightEnd: 6,
  dimStart: 20,
  idleHomeMins: 2,
  screensaverMins: 5,
  guestMode: false,
  showSamples: true,
  sounds: true,
  reducedMotion: false,
  keepAwake: true,
  wifiName: "",
  wifiPassword: "",
  guidebookUrl: "",
  houseGuide: {
    checkout: "Checkout is 10am. Pop used towels in the bathroom and start the dishwasher on your way out.",
    heating: "The heat pump remote lives on the lounge wall. 21° is cosy.",
    appliances: "Coffee machine, oven and washing machine guides are in the top kitchen drawer.",
    local: "Lake Taupō is a short walk away. Our favourite café and bakery are on Tongariro Street.",
  },
  familyJarTarget: 50,
  familyJarReward: "Movie night",
  teReo: true,
  nzDates: true,
  binDay: null,
  recycling: null,
};

export interface HubState {
  settings: Settings;
  members: Member[];
  notes: PostIt[];
  habits: Habit[];
  checkins: CheckIn[];
  nights: ReflectionNight[];
  claims: Claim[];
  localChores: Chore[];
  marbles: Record<string, number>;
  familyJar: number;
  localList: ListItem[];
  kidPlans: KidPlan[];
  mealHearts: Record<string, string[]>;
  localDinners: Record<string, string>;
  photos: Photo[];
  /** Calendar tasks ticked off: event id → the day it was ticked. */
  doneTasks: Record<string, string>;
  /** Recorded dinnertime chats, newest first. */
  reflections: FamilyReflection[];

  updateSettings: (patch: Partial<Settings>) => void;
  setMembers: (members: Member[]) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;

  addNote: (note: Omit<PostIt, "id" | "createdAt" | "seenBy" | "reactions" | "rotation">) => PostIt;
  markNoteSeen: (id: string, memberId: string) => void;
  reactToNote: (id: string, emoji: string, memberId: string) => void;
  finishNote: (id: string) => void;

  setHabit: (memberId: string, habit: Omit<Habit, "id" | "memberId" | "startDate" | "active">) => void;
  /** Adds a habit alongside the ones this person already has. */
  addHabit: (memberId: string, habit: Omit<Habit, "id" | "memberId" | "startDate" | "active">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  /** Stops a habit (its ticks are kept for the history). */
  stopHabit: (id: string) => void;
  checkIn: (input: {
    habitId: string;
    memberId: string;
    status: CheckInStatus;
    noteText?: string;
    noteMediaId?: string;
    date?: string;
  }) => void;
  completeNight: (participants: string[]) => void;

  addClaim: (c: Omit<Claim, "id" | "at" | "status" | "date">) => void;
  resolveClaim: (id: string, status: "approved" | "rejected", error?: string) => void;
  addLocalMarbles: (memberId: string, points: number) => void;

  addLocalItem: (name: string, category: string, addedBy?: string, recipe?: string) => void;
  toggleLocalItem: (id: string) => void;
  removeLocalItem: (id: string) => void;
  clearLocalChecked: () => void;

  addKidPlan: (p: Omit<KidPlan, "id" | "createdAt">) => void;
  markPlanAdded: (id: string) => void;
  removeKidPlan: (id: string) => void;

  toggleMealHeart: (key: string, memberId: string) => void;
  setLocalDinner: (date: string, recipeId: string) => void;

  addPhoto: (p: Omit<Photo, "id" | "addedAt">) => void;
  toggleTask: (eventId: string) => void;
  addReflection: (r: Omit<FamilyReflection, "id" | "at">) => void;
  removeReflection: (id: string) => void;
  removePhoto: (id: string) => void;

  resetAll: () => void;
}

const initialData = () => ({
  settings: DEFAULT_SETTINGS,
  members: DEFAULT_MEMBERS,
  notes: SAMPLE_NOTES(),
  habits: SAMPLE_HABITS(),
  checkins: [] as CheckIn[],
  nights: [] as ReflectionNight[],
  claims: [] as Claim[],
  localChores: SAMPLE_CHORES,
  marbles: { kid1: 7, kid2: 5 } as Record<string, number>,
  familyJar: 34,
  localList: SAMPLE_LIST(),
  kidPlans: [] as KidPlan[],
  mealHearts: {} as Record<string, string[]>,
  localDinners: {} as Record<string, string>,
  photos: [] as Photo[],
  doneTasks: {} as Record<string, string>,
  reflections: [] as FamilyReflection[],
});

export const useHub = create<HubState>()(
  persist(
    (set) => ({
      ...initialData(),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setMembers: (members) => set({ members }),
      updateMember: (id, patch) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

      addNote: (note) => {
        const full: PostIt = {
          ...note,
          id: uid("note"),
          createdAt: Date.now(),
          seenBy: [note.from],
          reactions: {},
          rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
        };
        set((s) => ({ notes: [full, ...s.notes] }));
        return full;
      },
      markNoteSeen: (id, memberId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id && !n.seenBy.includes(memberId) ? { ...n, seenBy: [...n.seenBy, memberId] } : n,
          ),
        })),
      reactToNote: (id, emoji, memberId) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id !== id) return n;
            const who = n.reactions[emoji] ?? [];
            const next = who.includes(memberId) ? who.filter((w) => w !== memberId) : [...who, memberId];
            return { ...n, reactions: { ...n.reactions, [emoji]: next } };
          }),
        })),
      finishNote: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, doneAt: Date.now() } : n)) })),

      setHabit: (memberId, habit) =>
        set((s) => ({
          habits: [
            ...s.habits.map((h) => (h.memberId === memberId ? { ...h, active: false } : h)),
            { ...habit, id: uid("habit"), memberId, startDate: dateKey(), active: true },
          ],
        })),
      addHabit: (memberId, habit) =>
        set((s) => ({
          habits: [...s.habits, { ...habit, id: uid("habit"), memberId, startDate: dateKey(), active: true }],
        })),
      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      stopHabit: (id) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, active: false } : h)) })),
      checkIn: ({ habitId, memberId, status, noteText, noteMediaId, date }) =>
        set((s) => {
          const day = date ?? dateKey();
          const rest = s.checkins.filter((c) => !(c.habitId === habitId && c.date === day));
          return {
            checkins: [
              ...rest,
              { id: uid("chk"), habitId, memberId, status, noteText, noteMediaId, date: day, at: Date.now() },
            ],
          };
        }),
      completeNight: (participants) =>
        set((s) => {
          const day = dateKey();
          const rest = s.nights.filter((n) => n.date !== day);
          return { nights: [...rest, { date: day, completedAt: Date.now(), participants }] };
        }),

      addClaim: (c) =>
        set((s) => ({
          claims: [
            ...s.claims,
            { ...c, id: uid("claim"), at: Date.now(), status: "pending", date: dateKey() },
          ],
        })),
      resolveClaim: (id, status, error) =>
        set((s) => ({ claims: s.claims.map((c) => (c.id === id ? { ...c, status, error } : c)) })),
      addLocalMarbles: (memberId, points) =>
        set((s) => ({
          marbles: { ...s.marbles, [memberId]: Math.max(0, (s.marbles[memberId] ?? 0) + points) },
          familyJar: Math.max(0, s.familyJar + points),
        })),

      addLocalItem: (name, category, addedBy, recipe) =>
        set((s) => {
          const exists = s.localList.find(
            (i) => !i.checked && i.name.toLowerCase() === name.toLowerCase().trim(),
          );
          if (exists) return s;
          return {
            localList: [
              { id: uid("item"), name: name.trim(), category, checked: false, addedBy, recipe, createdAt: Date.now() },
              ...s.localList,
            ],
          };
        }),
      toggleLocalItem: (id) =>
        set((s) => ({
          localList: s.localList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
        })),
      removeLocalItem: (id) => set((s) => ({ localList: s.localList.filter((i) => i.id !== id) })),
      clearLocalChecked: () => set((s) => ({ localList: s.localList.filter((i) => !i.checked) })),

      addKidPlan: (p) =>
        set((s) => ({ kidPlans: [...s.kidPlans, { ...p, id: uid("plan"), createdAt: Date.now() }] })),
      markPlanAdded: (id) =>
        set((s) => ({
          kidPlans: s.kidPlans.map((p) => (p.id === id ? { ...p, addedToCalendar: true } : p)),
        })),
      removeKidPlan: (id) => set((s) => ({ kidPlans: s.kidPlans.filter((p) => p.id !== id) })),

      toggleMealHeart: (key, memberId) =>
        set((s) => {
          const who = s.mealHearts[key] ?? [];
          const next = who.includes(memberId) ? who.filter((w) => w !== memberId) : [...who, memberId];
          return { mealHearts: { ...s.mealHearts, [key]: next } };
        }),

      setLocalDinner: (date, recipeId) =>
        set((s) => ({ localDinners: { ...s.localDinners, [date]: recipeId } })),

      addPhoto: (p) =>
        set((s) => ({ photos: [...s.photos, { ...p, id: uid("photo"), addedAt: Date.now() }] })),
      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

      addReflection: (r) =>
        set((s) => ({ reflections: [{ ...r, id: uid("refl"), at: Date.now() }, ...s.reflections].slice(0, 120) })),
      removeReflection: (id) => set((s) => ({ reflections: s.reflections.filter((r) => r.id !== id) })),

      toggleTask: (eventId) =>
        set((s) => {
          const next = { ...s.doneTasks };
          if (next[eventId]) delete next[eventId];
          else next[eventId] = dateKey();
          // Forget ticks older than a fortnight so this never grows forever.
          const cutoff = dateKey(new Date(Date.now() - 14 * 86400_000));
          for (const [k, d] of Object.entries(next)) if (d < cutoff) delete next[k];
          return { doneTasks: next };
        }),

      resetAll: () => set(initialData()),
    }),
    {
      name: "homehub-state",
      version: 2,
      // New settings get their defaults when an older saved copy loads.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HubState>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
      migrate: (persisted) => persisted as HubState,
    },
  ),
);

/* ── Derived helpers ───────────────────────────────────────────────────── */

export function activeHabit(habits: Habit[], memberId: string): Habit | undefined {
  return habits.find((h) => h.memberId === memberId && h.active);
}

/** Everything this person is working on, oldest first. */
export function activeHabits(habits: Habit[], memberId: string): Habit[] {
  return habits.filter((h) => h.memberId === memberId && h.active);
}

/** Most habits one person can have going at once. */
export const MAX_HABITS = 4;

/** Consecutive days (ending today or yesterday) with a "done" check-in. */
export function habitStreak(checkins: CheckIn[], habitId: string): number {
  const done = new Set(checkins.filter((c) => c.habitId === habitId && c.status === "done").map((c) => c.date));
  let streak = 0;
  const d = new Date();
  if (!done.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (done.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Nights in a row the family has done the dinnertime reflection. */
export function familyStreak(nights: ReflectionNight[]): number {
  const set = new Set(nights.map((n) => n.date));
  let streak = 0;
  const d = new Date();
  if (!set.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function unreadNotesFor(notes: PostIt[], memberId: string): PostIt[] {
  return notes.filter(
    (n) => !n.doneAt && (n.to === memberId || n.to === "everyone") && !n.seenBy.includes(memberId),
  );
}
