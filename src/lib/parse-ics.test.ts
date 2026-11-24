import { describe, expect, it } from "vitest";
import { parseIcs } from "../../api/_parse-ics";

/** Wrap event lines in a minimal VCALENDAR. */
function ics(...lines: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", ...lines, "END:VCALENDAR"].join("\r\n");
}

const FROM = new Date("2026-12-20T00:00:00Z");
const TO = new Date("2027-01-05T00:00:00Z");

describe("parseIcs", () => {
  it("parses an all-day event", () => {
    const events = parseIcs(
      ics("BEGIN:VEVENT", "UID:a1", "SUMMARY:Summer holidays", "DTSTART;VALUE=DATE:20261225", "DTEND;VALUE=DATE:20261226", "END:VEVENT"),
      "family",
      FROM,
      TO,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: "Summer holidays", start: "2026-12-25", end: "2026-12-26", allDay: true, calendar: "family" });
  });

  it("parses a timed event to an ISO instant", () => {
    const events = parseIcs(
      ics("BEGIN:VEVENT", "UID:t1", "SUMMARY:Dentist", "DTSTART:20261224T100000Z", "DTEND:20261224T110000Z", "END:VEVENT"),
      "family",
      FROM,
      TO,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: "Dentist", start: "2026-12-24T10:00:00.000Z", end: "2026-12-24T11:00:00.000Z", allDay: false });
  });

  it("expands a weekly recurring event", () => {
    const events = parseIcs(
      ics("BEGIN:VEVENT", "UID:r1", "SUMMARY:Football practice", "DTSTART:20261102T150000Z", "DTEND:20261102T160000Z", "RRULE:FREQ=WEEKLY;BYDAY=MO", "END:VEVENT"),
      "family",
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(events).toHaveLength(5); // Mondays 2, 9, 16, 23, 30 Nov 2026
    expect(events.every((e) => e.title === "Football practice")).toBe(true);
  });

  it("skips cancelled events", () => {
    const events = parseIcs(
      ics("BEGIN:VEVENT", "UID:c1", "SUMMARY:Cancelled", "STATUS:CANCELLED", "DTSTART:20261224T100000Z", "DTEND:20261224T110000Z", "END:VEVENT"),
      "family",
      FROM,
      TO,
    );
    expect(events).toHaveLength(0);
  });

  it("resolves a NZ timezone (TZID) event via its VTIMEZONE", () => {
    const events = parseIcs(
      ics(
        "BEGIN:VTIMEZONE",
        "TZID:Pacific/Auckland",
        "BEGIN:STANDARD",
        "DTSTART:19700101T000000",
        "TZOFFSETFROM:+1300",
        "TZOFFSETTO:+1300",
        "TZNAME:NZDT",
        "END:STANDARD",
        "END:VTIMEZONE",
        "BEGIN:VEVENT",
        "UID:nz1",
        "SUMMARY:School drop-off",
        "DTSTART;TZID=Pacific/Auckland:20261224T083000",
        "DTEND;TZID=Pacific/Auckland:20261224T093000",
        "END:VEVENT",
      ),
      "family",
      FROM,
      TO,
    );
    expect(events).toHaveLength(1);
    expect(events[0].allDay).toBe(false);
    // 08:30 NZDT (+13) == 19:30 UTC the previous day.
    expect(events[0].start).toBe("2026-12-23T19:30:00.000Z");
  });
});
