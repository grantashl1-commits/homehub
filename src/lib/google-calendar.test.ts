import { describe, expect, it } from "vitest";
import { googleTemplateUrl } from "./google-calendar";

describe("googleTemplateUrl", () => {
  it("carries the time, location and notes over to Google", () => {
    const url = new URL(
      googleTemplateUrl({ title: "Swim lessons", emoji: "🏊", date: "2026-11-26", part: "afternoon", time: "15:30", endTime: "16:15", location: "AC Baths, Taupō", notes: "Bring goggles", createdBy: "mum" }),
    );
    const q = url.searchParams;
    expect(q.get("text")).toBe("🏊 Swim lessons");
    expect(q.get("location")).toBe("AC Baths, Taupō");
    expect(q.get("details")).toContain("Bring goggles");
    const [from, to] = q.get("dates")!.split("/");
    expect(new Date(from.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).getTime()).toBe(new Date(2026, 10, 26, 15, 30).getTime());
    expect(new Date(to.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).getTime()).toBe(new Date(2026, 10, 26, 16, 15).getTime());
  });

  it("uses the part of the day and an hour when there's no set time", () => {
    const q = new URL(googleTemplateUrl({ title: "Party", emoji: "🎉", date: "2026-11-28", part: "morning", createdBy: "kid1" })).searchParams;
    expect(q.get("location")).toBeNull();
    expect(q.get("dates")).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
  });
});
