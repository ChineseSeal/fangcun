import { describe, expect, it } from "vitest";
import { glyphCatalog } from "@fangcun/glyph-tools/catalog";
import { renderSeal } from "./index";
import { relayoutSeal } from "./generate";

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

describe("R2 Golden Cases", () => {
  it("G01 · renders a one-character red seal", () => {
    const result = renderSeal(
      { text: "方", mode: "yang", impression: { seed: 101 } },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect({ hash: stableHash(result.svg), length: result.svg.length }).toEqual({
      hash: "f68e1370",
      length: 2250,
    });
    expect(result.svg).toContain("朱文印面，印文凸起");
    expect(result.svg).toContain('data-char="方"');
    expect(result.missingGlyphs).toEqual([]);
  });

  it("G02 · renders a two-character vertical white seal", () => {
    const result = renderSeal(
      {
        text: "方寸",
        mode: "yin",
        layout: { strategy: "vertical_2" },
        impression: { seed: 202 },
      },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect({ hash: stableHash(result.svg), length: result.svg.length }).toEqual({
      hash: "fcecf9c6",
      length: 3910,
    });
    expect(result.svg.match(/data-char=/g)).toHaveLength(2);
    expect(result.svg).toContain("白文印面，印文凹陷");
    expect(result.svg).toContain('translate(260.0000 30.0000)');
    expect(result.svg).toContain('translate(260.0000 510.0000)');
    expect(result.missingGlyphs).toEqual([]);
  });

  it("G03 · renders a three-character irregular ancient-seal layout", () => {
    const result = renderSeal(
      {
        text: "清风明",
        style: "guxi_warring_states",
        layout: { strategy: "guxi_3" },
        border: { type: "irregular" },
      },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg.match(/data-char=/g)).toHaveLength(3);
      expect(result.svg).toContain("stroke-linejoin=\"round\"");
      expect(result.explain.styleTermSlug).toBe("guxi");
    }
  });

  it("G04 · exposes huiwen reading facts for a four-character seal", () => {
    const result = renderSeal(
      {
        text: "清风明月",
        layout: { strategy: "huiwen", readingOrder: "huiwen" },
        grid: { type: "tian" },
      },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.explain.readingOrderTermSlug).toBe("huiwen");
      expect(result.explain.readingOrder).toEqual(["右上", "右下", "左上", "左下"]);
      expect(result.explain.annotations.some((annotation) => annotation.kind === "grid")).toBe(true);
      expect(result.svg).toContain("M500 38V962M38 500H962");
    }
  });

  it("G05 · increases glyph scale for a high-density white seal", () => {
    const result = renderSeal(
      { text: "清风明月", layout: { strategy: "grid_2x2", density: 0.88 } },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.explain.densityBand).toBe("full");
      expect(result.explain.densityTermSlug).toBe("manbai");
      expect(result.svg).toContain('scale(0.455800');
    }
  });

  it("G06/G07 · keeps no mask at zero distress and deterministic mask at high distress", () => {
    const clean = renderSeal({ text: "方", impression: { distress: 0, seed: 17 } }, glyphCatalog);
    const distressed = renderSeal({ text: "方", impression: { distress: 1, seed: 17 } }, glyphCatalog);
    const repeated = renderSeal({ text: "方", impression: { distress: 1, seed: 17 } }, glyphCatalog);

    expect(clean.ok).toBe(true);
    expect(distressed.ok).toBe(true);
    expect(repeated.ok).toBe(true);
    if (clean.ok && distressed.ok && repeated.ok) {
      expect(clean.svg).not.toContain("seal-distress");
      expect(distressed.svg).toContain('id="seal-distress"');
      expect(distressed.svg).toContain('data-retained-ink="0.7000"');
      expect(distressed.svg).toBe(repeated.svg);
    }
  });

  it("G08/G09 · supports thick borders and circular seals", () => {
    const thick = renderSeal({ text: "方", border: { type: "thick", width: 0.08 } }, glyphCatalog);
    const circle = renderSeal({ text: "方", shape: { type: "circle" } }, glyphCatalog);

    expect(thick.ok).toBe(true);
    expect(circle.ok).toBe(true);
    if (thick.ok && circle.ok) {
      expect(thick.svg).toContain('stroke-width="80.00"');
      expect(circle.svg).toContain("<circle cx=\"500\" cy=\"500\" r=\"460\"");
      expect(circle.explain.annotations[0]?.path).toContain("A460 460");
    }
  });

  it("G10 · relayout preserves locked glyph geometry fields", () => {
    const result = relayoutSeal(
      {
        text: "方寸",
        layout: { strategy: "vertical_2" },
        glyphs: [{ locked: true, dx: 0.08, rotate: 2 }],
      },
      "horizontal_2",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lockedGlyphs).toBe(1);
      expect(result.dsl.layout.strategy).toBe("horizontal_2");
      expect(result.dsl.glyphs[0]).toMatchObject({ locked: true, dx: 0.08, rotate: 2 });
      expect(result.dsl.glyphs[1]).toMatchObject({ locked: false, dx: 0, dy: 0, rotate: 0 });
    }
  });

  it("G16 · returns explain facts with term slugs and annotation paths", () => {
    const result = renderSeal(
      { text: "方寸", mode: "yin", border: { type: "single" } },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.explain).toMatchObject({
        charCount: 2,
        modeTermSlug: "baiwen",
        styleTermSlug: "han-seal",
        layoutTermSlug: "zhangfa",
        borderType: "single",
      });
      expect(result.explain.annotations[0]).toEqual({
        kind: "border",
        termSlug: "yinbian",
        path: "M38 38H962V962H38Z",
      });
      expect(result.explain.annotations.map((annotation) => annotation.kind)).toEqual([
        "border",
        "imprint",
        "whitespace",
        "density",
      ]);
    }
  });

  it("G18 · derives exact distress annotations from the same deterministic seed", () => {
    const first = renderSeal(
      { text: "方寸", impression: { distress: 0.72, seed: 1801 } },
      glyphCatalog,
    );
    const second = renderSeal(
      { text: "方寸", impression: { distress: 0.72, seed: 1801 } },
      glyphCatalog,
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      const firstDistress = first.explain.annotations.find((annotation) => annotation.kind === "distress");
      const secondDistress = second.explain.annotations.find((annotation) => annotation.kind === "distress");
      expect(firstDistress?.termSlug).toBe("cansun");
      expect(firstDistress?.path).toBe(secondDistress?.path);
      expect(firstDistress?.path).toContain("A");
    }
  });
});
