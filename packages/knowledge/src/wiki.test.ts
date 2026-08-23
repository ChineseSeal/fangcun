import { describe, expect, it } from "vitest";
import { termSeeds } from "./terms";
import { findWikiEntry, wikiEntries } from "./wiki";

describe("published wiki entries", () => {
  it("contains the 12 required core entries with stable slugs", () => {
    expect(wikiEntries.map((entry) => entry.slug)).toEqual([
      "zhuwen",
      "baiwen",
      "han-seal",
      "guxi",
      "zhangfa",
      "bianfankuan",
      "yinni",
      "qianyin",
      "xianzhang",
      "mingzhang",
      "cansun",
      "jiege",
    ]);
    expect(new Set(wikiEntries.map((entry) => entry.slug)).size).toBe(12);
  });

  it("keeps content, references, relationships, and examples complete", () => {
    const knownTerms = new Set(termSeeds.map((term) => term.slug));
    for (const entry of wikiEntries) {
      expect(entry.oneLinerZh.length).toBeLessThanOrEqual(40);
      expect(entry.sections.length).toBeGreaterThanOrEqual(2);
      expect(entry.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
      expect(entry.references.length).toBeGreaterThan(0);
      expect(entry.references.every((reference) => reference.url.startsWith("https://"))).toBe(true);
      expect(entry.relatedSlugs.every((slug) => knownTerms.has(slug))).toBe(true);
      expect(entry.examples).toHaveLength(2);
      expect(entry.examples[0].dsl.impression?.seed).toBe(entry.examples[1].dsl.impression?.seed);
      expect(findWikiEntry(entry.slug)).toBe(entry);
    }
  });

  it("avoids unsupported absolute authenticity claims", () => {
    const serialized = JSON.stringify(wikiEntries);
    expect(serialized).not.toMatch(/唯一|最正宗|完美复刻/);
  });
});
