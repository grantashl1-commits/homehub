import { describe, expect, it } from "vitest";
import type { CheckIn, Habit } from "./types";
import { habitDueOn, habitStats, weekProgress } from "./habit-stats";

const habit: Habit = { id: "h", memberId: "mum", title: "Water", icon: "💧", frequency: { kind: "daily" }, startDate: "2026-11-01", active: true };
const ci = (date: string, status: CheckIn["status"] = "done"): CheckIn => ({ id: date, habitId: "h", memberId: "mum", date, status, at: 0 });
const today = new Date(2026, 10, 24, 12); // Tue 24 Nov 2026

describe("habitStats", () => {
  it("counts the current streak from yesterday when today isn't ticked yet", () => {
    const s = habitStats(habit, [ci("2026-11-21"), ci("2026-11-22"), ci("2026-11-23")], today);
    expect(s.streak).toBe(3);
  });

  it("remembers the best streak and this month's ticks", () => {
    const s = habitStats(habit, [ci("2026-11-02"), ci("2026-11-03"), ci("2026-11-04"), ci("2026-11-05"), ci("2026-11-10"), ci("2026-11-24")], today);
    expect(s.best).toBe(4);
    expect(s.streak).toBe(1);
    expect(s.monthDone).toBe(6);
    expect(s.monthDays).toBe(24);
  });

  it("lays out four Monday-to-Sunday weeks ending this week", () => {
    const s = habitStats(habit, [ci("2026-11-23"), ci("2026-11-22", "not_today")], today);
    expect(s.weeks).toHaveLength(4);
    expect(s.weeks[3][0]).toEqual({ key: "2026-11-23", mark: "done" });
    expect(s.weeks[2][6]).toEqual({ key: "2026-11-22", mark: "not_today" });
    expect(s.weeks[3][2].mark).toBe("future");
    expect(s.weeks[0][0]).toEqual({ key: "2026-11-02", mark: "none" });
    const late = habitStats({ ...habit, startDate: "2026-11-20" }, [], today);
    expect(late.weeks[0][0].mark).toBe("before");
    expect(late.weeks[2][5]).toEqual({ key: "2026-11-21", mark: "none" });
  });
});

describe("weekProgress and habitDueOn", () => {
  it("counts this week's ticks against the habit's goal", () => {
    const three = { ...habit, frequency: { kind: "perWeek" as const, times: 3 } };
    expect(weekProgress(three, [ci("2026-11-22"), ci("2026-11-23"), ci("2026-11-24"), ci("2026-11-24", "not_today")], today)).toEqual({ done: 2, goal: 3 });
    expect(weekProgress({ ...habit, frequency: { kind: "weekdays" } }, [], today).goal).toBe(5);
  });

  it("rests school-days habits at the weekend", () => {
    const school = { ...habit, frequency: { kind: "weekdays" as const } };
    expect(habitDueOn(school, new Date(2026, 10, 28))).toBe(false);
    expect(habitDueOn(school, today)).toBe(true);
    expect(habitDueOn(habit, new Date(2026, 10, 28))).toBe(true);
  });
});
