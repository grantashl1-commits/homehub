import { describe, expect, it } from "vitest";
import { isoWeekKey } from "./time";

describe("isoWeekKey", () => {
  it("formats as YYYY-Www (SIGNAL's week key)", () => {
    // 1 Jan 2026 is a Thursday → ISO week 1 of 2026.
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe("2026-W01");
    // Monday 5 Jan 2026 starts ISO week 2.
    expect(isoWeekKey(new Date(2026, 0, 5))).toBe("2026-W02");
    // Monday 29 Dec 2025 is the first day of ISO week 1 of 2026.
    expect(isoWeekKey(new Date(2025, 11, 29))).toBe("2026-W01");
  });

  it("always matches the YYYY-Www shape", () => {
    for (const d of [new Date(2026, 5, 15), new Date(2027, 0, 1), new Date(2026, 11, 31)]) {
      expect(isoWeekKey(d)).toMatch(/^\d{4}-W\d{2}$/);
    }
  });
});
