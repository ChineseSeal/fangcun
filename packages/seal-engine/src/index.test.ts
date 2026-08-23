import { describe, expect, it } from "vitest";
import { glyphCatalog } from "@fangcun/glyph-tools/catalog";
import { renderSeal } from "./index";

describe("renderSeal", () => {
  it("renders a deterministic one-character seal", () => {
    const input = { text: "方", impression: { seed: 7 } };
    const first = renderSeal(input, glyphCatalog);
    const second = renderSeal(input, glyphCatalog);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.svg).toBe(second.svg);
      expect(first.explain.modeTermSlug).toBe("baiwen");
      expect(first.explain.annotations[0]?.termSlug).toBe("yinbian");
      expect(first.svg).toContain('data-char="方"');
      expect(first.missingGlyphs).toEqual([]);
    }
  });

  it("supports the R1 2×2 static layout", () => {
    const result = renderSeal({ text: "清风明月", layout: { strategy: "grid_2x2" } }, glyphCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg.match(/data-char=/g)).toHaveLength(4);
      expect(result.explain.readingOrderTermSlug).toBeNull();
    }
  });

  it("keeps traditional horizontal reading ordered from right to left", () => {
    const result = renderSeal(
      { text: "应衢", layout: { strategy: "horizontal_2", readingOrder: "traditional" } },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.explain.readingOrder).toEqual(["右", "左"]);
      expect(result.svg).toMatch(/data-char="应"[^>]+translate\(510\.0000 260\.0000\)/);
      expect(result.svg).toMatch(/data-char="衢"[^>]+translate\(30\.0000 260\.0000\)/);
    }
  });

  it("keeps rendering and reports missing glyphs", () => {
    const result = renderSeal({ text: "方龘" }, glyphCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.missingGlyphs).toEqual(["龘"]);
      expect(result.warnings).toContain("MISSING_GLYPH:龘");
    }
  });

  it("removes the paper field from transparent yang exports", () => {
    const result = renderSeal(
      { text: "方", mode: "yang", paper: { color: "none" } },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg).not.toContain('<rect width="1000" height="1000" fill="#F3EFE6"/>');
      expect(result.svg).toContain('data-char="方"');
    }
  });
});
