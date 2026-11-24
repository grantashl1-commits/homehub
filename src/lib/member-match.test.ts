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

describe("grandparents and joined emoji", () => {
  const parents: Member[] = [
    { id: "matt", name: "Matt", role: "parent", palId: "ridge", keywords: "👨" },
    { id: "ash", name: "Ash", role: "parent", palId: "marlow", keywords: "👩" },
    { id: "leo", name: "Leo", role: "child", palId: "pip", keywords: "👦" },
    { id: "ruby", name: "Ruby", role: "child", palId: "sunny", keywords: "👧" },
  ];

  it("keeps Grandma + Grandad (👩‍🦳👨‍🦳) in Family, not on Mum and Dad", () => {
    expect(membersForTitle("👩‍🦳👨‍🦳🐈 Grandma + Grandad Visiting", parents)).toEqual([]);
    expect(membersForTitle("👵🏼👴🏼 Grandparents", parents)).toEqual([]);
  });

  it("still gives a lone parent emoji to that parent", () => {
    expect(membersForTitle("🎾👩 Tennis", parents)).toEqual(["ash"]);
  });

  it("gives Athletics with a girl and a boy to Ruby and Leo", () => {
    expect(membersForTitle("🏃🏁👧🏼👦🏼 Athletics", parents)).toEqual(["leo", "ruby"]);
  });

  it("gives a kid emoji to the children when they haven't set their own emoji", () => {
    const plainKids = parents.map((m) => (m.role === "child" ? { ...m, keywords: undefined } : m));
    expect(membersForTitle("🏁👧👦 Athletics", plainKids)).toEqual(["leo", "ruby"]);
    expect(membersForTitle("🧒 Swimming", plainKids)).toEqual(["leo", "ruby"]);
  });
});
