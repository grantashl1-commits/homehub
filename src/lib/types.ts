import type { PalId } from "./pals";

export type Role = "parent" | "child";

export interface Member {
  id: string;
  name: string;
  role: Role;
  palId: PalId;
  /** Linked PointPals kid id, when PointPals is connected. */
  pointpalsKidId?: string;
  /** "MM-DD", for birthday countdowns. */
  birthday?: string;
  /** Their own profile photo: a small square JPEG data URL, kept on this screen. Shown instead of the character. */
  photo?: string;
  /** Comma-separated words or emoji that mean this person on the calendar ("👦, athletics"). */
  keywords?: string;
}

export type NoteColor = "sun" | "rose" | "sky" | "sage" | "lilac" | "peach";
export type NoteKind = "text" | "voice" | "doodle";

export interface PostIt {
  id: string;
  from: string;
  /** Member id, or "everyone". */
  to: string;
  kind: NoteKind;
  text?: string;
  mediaId?: string;
  durationMs?: number;
  color: NoteColor;
  sticker?: string;
  rotation: number;
  createdAt: number;
  seenBy: string[];
  reactions: Record<string, string[]>;
  doneAt?: number;
}

export type HabitFrequency =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "perWeek"; times: number };

export interface Habit {
  id: string;
  memberId: string;
  title: string;
  /** PointPals icon key, image URL or emoji. */
  icon: string;
  frequency: HabitFrequency;
  startDate: string;
  active: boolean;
  /** The PointPals skill this habit is saved as, once synced. */
  pointpalsSkillId?: string;
}

export type CheckInStatus = "done" | "not_today";

export interface CheckIn {
  id: string;
  habitId: string;
  memberId: string;
  date: string;
  status: CheckInStatus;
  noteText?: string;
  noteMediaId?: string;
  at: number;
}

/** A recorded dinnertime chat: the transcript, a summary, and each person's part. */
export interface FamilyReflection {
  id: string;
  date: string;
  at: number;
  transcript: string;
  summary?: string;
  /** memberId → a few lines about what they shared. */
  people: Record<string, string>;
}

export interface ReflectionNight {
  date: string;
  completedAt: number;
  participants: string[];
}

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface Claim {
  id: string;
  memberId: string;
  choreId: string;
  choreName: string;
  choreIcon: string;
  points: number;
  date: string;
  at: number;
  status: ClaimStatus;
  source: "pointpals" | "local";
  error?: string;
}

export interface Chore {
  id: string;
  name: string;
  icon: string;
  points: number;
  /** null = everyone's job. */
  memberIds: string[] | null;
  recurrence?: "none" | "daily" | "weekly";
}

export interface ListItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
  addedBy?: string;
  recipe?: string;
  createdAt: number;
}

export type DayPart = "morning" | "afternoon" | "evening";

export interface KidPlan {
  id: string;
  what: string;
  title: string;
  emoji: string;
  date: string;
  part: DayPart;
  memberIds: string[];
  /** "HH:MM" when known (e.g. read off a school notice). */
  time?: string;
  endTime?: string;
  location?: string;
  /** Anything to bring or remember; goes into the Google event's description. */
  notes?: string;
  voiceMediaId?: string;
  createdBy: string;
  createdAt: number;
  addedToCalendar?: boolean;
}

export interface Photo {
  id: string;
  mediaId: string;
  kind: "image" | "video";
  addedAt: number;
}

export interface HouseGuide {
  checkout: string;
  heating: string;
  appliances: string;
  local: string;
}

export interface Settings {
  familyName: string;
  setupDone: boolean;
  pinHash?: string;
  pinSalt?: string;
  /** Long random key shared with the Vercel functions (HUB_ACCESS_KEY). */
  hubKey?: string;
  nightStart: number;
  nightEnd: number;
  dimStart: number;
  idleHomeMins: number;
  screensaverMins: number;
  guestMode: boolean;
  showSamples: boolean;
  sounds: boolean;
  reducedMotion: boolean;
  keepAwake: boolean;
  wifiName: string;
  wifiPassword: string;
  guidebookUrl: string;
  houseGuide: HouseGuide;
  familyJarTarget: number;
  familyJarReward: string;
  /** Te reo Māori greetings and day names. */
  teReo: boolean;
  /** NZ school terms and public holidays on the calendar. */
  nzDates: boolean;
  /** Kerbside collection weekday (0 = Sunday), or null for no reminder. */
  binDay: number | null;
  recycling: "weekly" | "even" | "odd" | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  calendar: "family" | "bookings" | "kids" | "hub" | "nz";
  sample?: boolean;
  kidPlanId?: string;
  emoji?: string;
}

export interface Recipe {
  id: string;
  name: string;
  image: string | null;
  ingredients: string[];
  serves: number | null;
  time: string | null;
  category: string | null;
  /** Method steps, when we have them (the family's own SIGNAL recipes). */
  method?: string[];
  /** One of the family's own recipes from SIGNAL "My recipes" (id "user:<uuid>"). */
  mine?: boolean;
  sourceUrl?: string | null;
}
