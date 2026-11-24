import { describe, expect, it } from "vitest";
import { readState, signState, toHubTask } from "../../api/google-tasks";

describe("Google Tasks connect state", () => {
  process.env.HUB_SECRETS_KEY = "test-secret";

  it("round-trips the family and grown-up", () => {
    const s = signState("hh-1", "user-1");
    expect(readState(s)).toEqual({ householdId: "hh-1", userId: "user-1" });
  });

  it("refuses a tampered or expired state", () => {
    const s = signState("hh-1", "user-1");
    const raw = Buffer.from(s, "base64url").toString("utf8").replace("hh-1", "hh-2");
    expect(readState(Buffer.from(raw).toString("base64url"))).toBeNull();
    expect(readState(s, Date.now() + 20 * 60_000)).toBeNull();
  });
});

describe("toHubTask", () => {
  const list = { id: "L1", title: "My Tasks" };

  it("keeps the title, due date and notes", () => {
    expect(
      toHubTask({ id: "t1", title: " Make Muesli ", notes: "Put an online order through for ingredients", due: "2026-11-26T00:00:00.000Z", status: "needsAction" }, list),
    ).toMatchObject({ id: "t1", listId: "L1", list: "My Tasks", title: "Make Muesli", notes: "Put an online order through for ingredients", due: "2026-11-26" });
  });

  it("drops done, deleted and untitled tasks", () => {
    expect(toHubTask({ id: "a", title: "x", status: "completed" }, list)).toBeNull();
    expect(toHubTask({ id: "b", title: "x", deleted: true }, list)).toBeNull();
    expect(toHubTask({ id: "c", title: "  " }, list)).toBeNull();
  });
});
