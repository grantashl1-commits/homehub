import { describe, expect, it } from "vitest";
import { plain, membersForTitle } from "./member-match";
import type { Member } from "./types";

const member = (id: string, name: string, keywords?: string): Member => ({ id, name, role: "child", palId: "pip", keywords });

const family: Member[] = [
  member("matt", "Matt", "👨"),
  member("ash", "Ash", "👩"),
  member("leo", "Leo", "👦"),
  member("ruby", "Ruby", "👧"),
];

describe("plain", () => {
  it("drops skin tones so the same emoji always compares equal", () => {
    expect(plain("🤸🏼‍♀️")).toBe(plain("🤸‍♀️"));
    expect(plain("👍🏽")).toBe("👍");
  });
});

describe("membersForTitle", () => {
  it("gives a boy-only event to the boy", () => {
    expect(membersForTitle("🎾👦 Tennis", family)).toEqual(["leo"]);
  });

  it("gives a boy-and-girl event to both kids", () => {
    expect(membersForTitle("🎾👦👧 Tennis", family)).toEqual(["leo", "ruby"]);
  });

  it("matches an activity emoji carrying a gender sign", () => {
    // The real feeds write "🤸🏼‍♀️🤸‍♂️ Gymnastics"; the skin tone must not matter.
    expect(membersForTitle("🤸🏼‍♀️🤸🏽‍♂️ Gymnastics", [member("leo", "Leo", "🤸‍♂️"), member("ruby", "Ruby", "🤸‍♀️")])).toEqual([
      "leo",
      "ruby",
    ]);
  });

  it("gives a parent's named event to that parent", () => {
    expect(membersForTitle("🎾👨 Matt Business House", family)).toEqual(["matt"]);
    expect(membersForTitle("👩 Ash netball", family)).toEqual(["ash"]);
  });

  it("still matches names as whole words", () => {
    expect(membersForTitle("Athletics with Leo", family)).toEqual(["leo"]);
    // "Leo" inside another word is not a match.
    expect(membersForTitle("Leonardo's birthday", family)).toEqual([]);
  });

  it("leaves an event nobody claims in the Family column", () => {
    expect(membersForTitle("Family dinner at Nana's", family)).toEqual([]);
  });
});
