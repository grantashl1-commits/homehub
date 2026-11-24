import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../types";
import { isTask, taskTitle } from "./calendar";

const ev = (title: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: title,
  title,
  start: "2026-11-24T09:00:00Z",
  end: "2026-11-24T10:00:00Z",
  allDay: false,
  calendar: "family",
  ...extra,
});

describe("calendar tasks", () => {
  it("spots tasks by their prefix and strips it", () => {
    for (const t of ["To do: Pay rates", "TODO - Pay rates", "to-do: Pay rates", "Task: Pay rates", "☐ Pay rates", "[ ] Pay rates"]) {
      expect(isTask(ev(t))).toBe(true);
      expect(taskTitle(ev(t))).toBe("Pay rates");
    }
  });

  it("treats all-day family and kids' entries as tasks, but not holidays or bookings", () => {
    expect(isTask(ev("Library books back", { allDay: true }))).toBe(true);
    expect(isTask(ev("Sports gear", { allDay: true, calendar: "kids" }))).toBe(true);
    expect(isTask(ev("Labour Day", { allDay: true, calendar: "nz" }))).toBe(false);
    expect(isTask(ev("Guests arrive", { allDay: true, calendar: "bookings" }))).toBe(false);
  });

  it("leaves timed appointments alone", () => {
    expect(isTask(ev("Swimming lesson"))).toBe(false);
    expect(isTask(ev("Today's tasks review"))).toBe(false);
  });
});
