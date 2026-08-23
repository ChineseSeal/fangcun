import { describe, expect, it } from "vitest";
import { linkTerms, termSeeds } from "./terms";

describe("MVP knowledge seed terms", () => {
  it("contains the required 30 terms", () => {
    expect(termSeeds).toHaveLength(30);
    expect(new Set(termSeeds.map((term) => term.slug)).size).toBe(30);
  });

  it("keeps references and CTAs complete", () => {
    expect(
      termSeeds.every(
        (term) =>
          term.oneLinerZh.length > 0 &&
          term.pinyinZh.length > 0 &&
          term.refs.length > 0 &&
          term.cta.href.startsWith("/academy/"),
      ),
    ).toBe(true);
    expect(termSeeds.filter((term) => term.cta.href.startsWith("/academy/wiki/"))).toHaveLength(12);
  });

  it("links each term once and respects the density limit", () => {
    expect(linkTerms("白文与朱文决定印式，白文在汉印中常见。", { maxPerParagraph: 2 })).toEqual([
      { text: "白文", slug: "baiwen" },
      { text: "与" },
      { text: "朱文", slug: "zhuwen" },
      { text: "决定印式，白文在汉印中常见。" },
    ]);
  });
});
