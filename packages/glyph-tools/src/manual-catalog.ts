import { manualGlyphData } from "./generated/manual-glyphs.generated";
import type { GlyphVariant } from "./index";
import { GLYPH_ASSET_VERSION } from "./variant-factory";

export const manualGlyphCatalog: readonly GlyphVariant[] = manualGlyphData.map((glyph) => ({
  id: `fangcun-modern-v1:han_seal:${glyph.character.codePointAt(0)?.toString(16).toUpperCase()}`,
  character: glyph.character,
  unicode: `U+${glyph.character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`,
  script: "han_seal",
  svgPath: glyph.svgPath,
  viewBox: "0 0 1000 1000",
  bbox: [...glyph.bbox] as [number, number, number, number],
  visualCenter: { x: glyph.visualCenter[0], y: glyph.visualCenter[1] },
  inkDensity: glyph.inkDensity,
  complexity: glyph.complexity,
  strokeCount: glyph.strokeCount,
  source: "Fangcun modern sealization v1",
  sourceId: "fangcun-modern-v1",
  sourceUrl: "https://github.com/ChineseSeal/fangcun",
  sourceCharacter: glyph.character,
  license: "CC BY 4.0 — Fangcun project geometry",
  era: "现代规则篆化",
  confidence: "generated",
  isModernSealized: true,
  noteZh: "用于缺少可靠开放字形时的现代规则篆化，不能视为历史摹本。",
  assetVersion: GLYPH_ASSET_VERSION,
  assetHash: glyph.assetHash,
  stretchLimits: { x: [0.82, 1.18], y: [0.82, 1.18] },
  tags: ["han-seal", "modern-sealized", "generated", "fallback"],
}));
