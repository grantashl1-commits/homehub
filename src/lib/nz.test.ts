import { describe, expect, it } from "vitest";
import { binReminder, nzCalendarEvents, sleepsLabel, sleepsUntil } from "./nz";

describe("sleepsUntil / sleepsLabel", () => {
  it("counts whole days from local midnight", () => {
    const now = new Date(2026, 11, 24, 15, 0);
    expect(sleepsUntil(new Date(2026, 11, 25), now)).toBe(1);
    expect(sleepsUntil(new Date(2026, 11, 24), now)).toBe(0);
    expect(sleepsLabel(1)).toBe("1 sleep");
    expect(sleepsLabel(0)).toBe("Today!");
  });
});

describe("nzCalendarEvents", () => {
  it("includes terms, holidays and public holidays as all-day NZ events", () => {
    const events = nzCalendarEvents();
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Christmas Day");
    expect(titles).toContain("Term 2 starts");
    expect(titles.some((t) => t.includes("Summer holidays"))).toBe(true);
    expect(events.every((e) => e.allDay && e.calendar === "nz")).toBe(true);
  });
});

describe("binReminder", () => {
  it("reminds the evening before collection", () => {
    // Thu 1 Jan 2026, 18:00; collection Friday (getDay 5).
    expect(binReminder(5, null, new Date(2026, 0, 1, 18, 0))).toEqual({ when: "tonight", recycling: false });
  });

  it("reminds on collection morning", () => {
    // Thu 1 Jan 2026, 08:00; collection Thursday (getDay 4).
    expect(binReminder(4, null, new Date(2026, 0, 1, 8, 0))).toEqual({ when: "this morning", recycling: false });
  });

  it("is silent otherwise", () => {
    expect(binReminder(5, null, new Date(2026, 0, 1, 10, 0))).toBeNull();
    expect(binReminder(null, null, new Date())).toBeNull();
  });
});
