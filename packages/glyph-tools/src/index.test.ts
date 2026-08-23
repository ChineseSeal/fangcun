import { describe, expect, it } from "vitest";
import { GLYPH_ASSET_VERSION, glyphCatalog } from "./catalog";
import { listGlyphVariants, loadGlyphs, validateGlyphVariant } from "./index";
import { loadGlyphCatalogForText } from "./server-catalog";

describe("glyph tools", () => {
  it("publishes a versioned catalog whose variants pass the hard quality gates", () => {
    expect(glyphCatalog).toHaveLength(10_180);
    expect(glyphCatalog.every((variant) => validateGlyphVariant(variant).ok)).toBe(true);
    expect(glyphCatalog.every((variant) => variant.assetVersion === GLYPH_ASSET_VERSION)).toBe(true);
    expect(glyphCatalog.every((variant) => variant.assetHash.length >= 16)).toBe(true);
  });

  it("loads exact Xiaozhuan and GuXi outlines from independent SVG assets", () => {
    const xiaozhuan = loadGlyphs("方寸", "xiaozhuan", glyphCatalog);
    const guxi = loadGlyphs("三", "guxi", glyphCatalog);

    expect(xiaozhuan.every((glyph) => glyph.ok && glyph.variant.script === "xiaozhuan")).toBe(true);
    expect(guxi[0]?.ok && guxi[0].variant.script).toBe("guxi");
  });

  it("maps modern input aliases while preserving the source character", () => {
    const wind = loadGlyphs("风", "xiaozhuan", glyphCatalog)[0];
    const hairVariants = listGlyphVariants("发", "xiaozhuan", glyphCatalog);

    expect(wind?.ok && wind.variant.sourceCharacter).toBe("風");
    expect(hairVariants.filter((variant) => variant.script === "xiaozhuan").map((variant) => variant.sourceCharacter)).toEqual([
      "發",
      "髮",
    ]);
  });

  it("uses documented fallback levels without aborting a batch", () => {
    const related = loadGlyphs("方", "han_seal", glyphCatalog)[0];
    const modern = loadGlyphs("亨", "xiaozhuan", glyphCatalog)[0];
    const missing = loadGlyphs("方龘", "han_seal", glyphCatalog);

    expect(related?.ok && related.fallbackLevel).toBe("related_script");
    expect(related?.ok && related.variant.script).toBe("xiaozhuan");
    expect(modern?.ok && modern.fallbackLevel).toBe("modern_sealization");
    expect(missing[0]?.ok).toBe(true);
    expect(missing[1]).toEqual({
      ok: false,
      char: "龘",
      fallbackLevel: "none",
      reason: "MISSING_GLYPH",
    });
  });

  it("lists the preferred script first without mutating the catalog", () => {
    const originalFirstId = glyphCatalog[0]?.id;
    const variants = listGlyphVariants("三", "guxi", glyphCatalog);

    expect(variants[0]?.script).toBe("guxi");
    expect(variants.some((variant) => variant.script === "xiaozhuan")).toBe(true);
    expect(glyphCatalog[0]?.id).toBe(originalFirstId);
    expect(listGlyphVariants("方寸", "guxi", glyphCatalog)).toEqual([]);
  });

  it("loads only Unicode shards needed by server-side input", async () => {
    const subset = await loadGlyphCatalogForText("发亨龘");

    expect(new Set(subset.map((variant) => variant.character))).toEqual(new Set(["发", "亨"]));
    expect(subset.filter((variant) => variant.character === "发" && variant.script === "xiaozhuan").map((variant) => variant.sourceCharacter)).toEqual([
      "發",
      "髮",
    ]);
    expect(subset.find((variant) => variant.character === "亨")?.confidence).toBe("generated");
  });

  it("covers every supported script on demand without disguising derived forms as artifacts", async () => {
    const first = await loadGlyphCatalogForText("印");
    const second = await loadGlyphCatalogForText("印");
    const scripts = ["jiaguwen", "jinwen", "xiaozhuan", "guxi", "han_seal", "bird_worm"] as const;
    const exact = scripts.map((script) => first.find((variant) => variant.script === script));

    expect(exact.every(Boolean)).toBe(true);
    expect(new Set(exact.map((variant) => variant?.svgPath)).size).toBe(scripts.length);
    expect(exact.every((variant) => variant && validateGlyphVariant(variant).ok)).toBe(true);
    expect(exact.filter((variant) => variant?.script !== "xiaozhuan").every((variant) => (
      variant?.confidence === "generated" && variant.isModernSealized
    ))).toBe(true);
    expect(second.map((variant) => [variant.id, variant.assetHash, variant.svgPath])).toEqual(
      first.map((variant) => [variant.id, variant.assetHash, variant.svgPath]),
    );
    expect(scripts.map((script) => loadGlyphs("印", script, first)[0]?.fallbackLevel)).toEqual([
      "same_script",
      "same_script",
      "same_script",
      "same_script",
      "same_script",
      "same_script",
    ]);
  });
});
