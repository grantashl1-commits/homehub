/** Progress numbers for a habit: streaks, the tick grid, this month. */
import type { CheckIn, Habit } from "./types";
import { addDays, dateKey, fromDateKey, startOfWeek } from "./time";

export type DayMark = "done" | "not_today" | "none" | "future" | "before";

export interface HabitStats {
  streak: number;
  best: number;
  monthDone: number;
  monthDays: number;
  /** 4 rows of Mon–Sun, oldest week first, ending with this week. */
  weeks: { key: string; mark: DayMark }[][];
}

export function habitStats(habit: Habit, checkins: CheckIn[], today = new Date()): HabitStats {
  const byDay = new Map<string, CheckIn["status"]>();
  for (const c of checkins) if (c.habitId === habit.id) byDay.set(c.date, c.status);
  const todayKey = dateKey(today);
  const start = habit.startDate;

  const mark = (key: string): DayMark => {
    if (key > todayKey) return "future";
    if (key < start) return "before";
    const s = byDay.get(key);
    return s === "done" ? "done" : s === "not_today" ? "not_today" : "none";
  };

  // Current streak: consecutive done days ending today, or yesterday if today isn't ticked yet.
  let streak = 0;
  let d = new Date(today);
  if (byDay.get(dateKey(d)) !== "done") d = addDays(d, -1);
  while (byDay.get(dateKey(d)) === "done") {
    streak++;
    d = addDays(d, -1);
  }

  // Best streak since the habit started.
  let best = 0;
  let run = 0;
  for (let day = fromDateKey(start); dateKey(day) <= todayKey; day = addDays(day, 1)) {
    if (byDay.get(dateKey(day)) === "done") best = Math.max(best, ++run);
    else run = 0;
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = dateKey(monthStart) > start ? monthStart : fromDateKey(start);
  let monthDone = 0;
  let monthDays = 0;
  for (let day = new Date(from); dateKey(day) <= todayKey; day = addDays(day, 1)) {
    monthDays++;
    if (byDay.get(dateKey(day)) === "done") monthDone++;
  }

  const firstMonday = addDays(startOfWeek(today), -21);
  const weeks = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(addDays(firstMonday, w * 7 + i));
      return { key, mark: mark(key) };
    }),
  );

  return { streak, best: Math.max(best, streak), monthDone, monthDays, weeks };
}
