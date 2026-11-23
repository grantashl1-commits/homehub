import { describe, expect, it } from "vitest";
import { GUIDES, type GuideBlock } from "./guides";
import { sectionText } from "@/components/HouseGuide";

function allBlocks(blocks: GuideBlock[]): GuideBlock[] {
  return blocks.flatMap((b) => (b.kind === "tabs" ? [b, ...b.tabs.flatMap((t) => allBlocks(t.blocks))] : [b]));
}

describe.each(Object.values(GUIDES))("guide $name", (guide) => {
  it("has unique chapter ids and essentials that point at real chapters", () => {
    const ids = guide.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of guide.essentials) expect(ids).toContain(e.section);
  });

  it("has something to read in every chapter and tab", () => {
    for (const s of guide.sections) {
      expect(s.blocks.length).toBeGreaterThan(0);
      for (const b of allBlocks(s.blocks)) if (b.kind === "tabs") for (const t of b.tabs) expect(t.blocks.length).toBeGreaterThan(0);
      expect(sectionText(s).length).toBeGreaterThan(s.title.length);
    }
  });

  it("only links and shows photos over https", () => {
    for (const s of guide.sections) {
      if (s.image) expect(s.image).toMatch(/^https:\/\//);
      for (const b of allBlocks(s.blocks)) {
        if (b.kind === "cards") for (const c of b.cards) for (const u of [c.href, c.image]) if (u) expect(u).toMatch(/^https:\/\//);
        if (b.kind === "gallery") for (const p of b.photos) expect(p.src).toMatch(/^https:\/\//);
      }
    }
  });

  it("keeps the essentials guests ask about", () => {
    const text = guide.sections.map(sectionText).join(" ");
    for (const must of ["Call 111".toLowerCase(), "10am", "lockbox", "septic"]) expect(text.toLowerCase()).toContain(must);
  });
});
