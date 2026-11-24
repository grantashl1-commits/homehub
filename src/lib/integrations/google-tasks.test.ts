import { describe, expect, it } from "vitest";
import { dueLabel } from "./google-tasks";

describe("dueLabel", () => {
  it("says today, overdue or the day", () => {
    expect(dueLabel(null, "2026-11-25")).toBeNull();
    expect(dueLabel("2026-11-25", "2026-11-25")).toBe("Due today");
    expect(dueLabel("2026-11-26", "2026-11-25")).toMatch(/^Due Thu,? 26 Nov$/);
    expect(dueLabel("2026-11-23", "2026-11-25")).toMatch(/^Overdue · Mon,? 23 Nov$/);
  });
});
