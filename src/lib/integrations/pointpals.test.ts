import { describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));
const { matchByName } = await import("./pointpals");

const kids = [
  { id: "pp-mum", name: "Mum" },
  { id: "pp-leo", name: "Leo" },
  { id: "pp-dad", name: "Dad" },
  { id: "pp-ruby", name: "Ruby " },
];

describe("linking hub people to PointPals by name", () => {
  it("links everyone whose name matches, ignoring case and spaces", () => {
    const members = [
      { id: "mum", name: "mum" },
      { id: "dad", name: "Dad" },
      { id: "kid1", name: "Leo" },
      { id: "kid2", name: "Ruby" },
    ];
    expect(matchByName(members, kids)).toEqual([
      ["mum", "pp-mum"],
      ["dad", "pp-dad"],
      ["kid1", "pp-leo"],
      ["kid2", "pp-ruby"],
    ]);
  });

  it("keeps existing links and never links two people to the same PointPals person", () => {
    const members = [
      { id: "kid1", name: "Leo", pointpalsKidId: "pp-leo" },
      { id: "kid9", name: "Leo" },
      { id: "kid2", name: "Ruby", pointpalsKidId: "gone" },
    ];
    expect(matchByName(members, kids)).toEqual([["kid2", "pp-ruby"]]);
  });
});
