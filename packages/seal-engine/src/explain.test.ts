import { describe, expect, it } from "vitest";
import { glyphCatalog } from "@fangcun/glyph-tools/catalog";
import { renderSeal } from "./index";
import { explainFactFingerprint, formatExplainFacts } from "./explain";

describe("localized explain templates", () => {
  it("changes expression while preserving every geometry fact", () => {
    const rendered = renderSeal({
      text: "方寸",
      mode: "yin",
      style: "han_private",
      layout: { strategy: "vertical_2" },
      physical: { sizeMm: 25 },
    }, glyphCatalog);

    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const before = explainFactFingerprint(rendered.explain);
    const chinese = formatExplainFacts(rendered.explain, "zh-Hans");
    const english = formatExplainFacts(rendered.explain, "en");

    expect(chinese.summary).toContain("白文");
    expect(english.summary).toContain("Baiwen (intaglio seal)");
    expect(english.composition).toContain("composition (zhangfa)");
    expect(explainFactFingerprint(rendered.explain)).toBe(before);
  });

  it("localizes SVG accessibility text without changing path geometry", () => {
    const input = { text: "方寸", mode: "yin", impression: { seed: 81 } };
    const chinese = renderSeal(input, glyphCatalog, { locale: "zh-Hans" });
    const english = renderSeal(input, glyphCatalog, { locale: "en" });

    expect(chinese.ok).toBe(true);
    expect(english.ok).toBe(true);
    if (!chinese.ok || !english.ok) return;
    const paths = (svg: string) => [...svg.matchAll(/<path\b[^>]*>/g)].map((match) => match[0]);
    expect(paths(english.svg)).toEqual(paths(chinese.svg));
    expect(english.svg).toContain("Baiwen intaglio seal");
    expect(english.svg).not.toContain("白文印面");
    expect(explainFactFingerprint(english.explain)).toBe(explainFactFingerprint(chinese.explain));
  });
});
