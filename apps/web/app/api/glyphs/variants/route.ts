import { NextResponse } from "next/server";
import { listGlyphVariants, type GlyphScript } from "@fangcun/glyph-tools";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";

export const runtime = "nodejs";

const scripts = new Set<GlyphScript>([
  "xiaozhuan",
  "han_seal",
  "guxi",
  "bird_worm",
  "jinwen",
  "jiaguwen",
]);

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const character = search.get("char") ?? "";
  const requestedScript = search.get("script") as GlyphScript | null;
  if (Array.from(character).length !== 1) {
    return NextResponse.json(
      { ok: false, error: { code: "CHAR_REQUIRED", message: "char 必须是一个汉字" } },
      { status: 400 },
    );
  }
  const preferredScript = requestedScript && scripts.has(requestedScript) ? requestedScript : "han_seal";
  const glyphCatalog = await loadGlyphCatalogForText(character);
  const variants = listGlyphVariants(character, preferredScript, glyphCatalog).map((variant) => ({
    id: variant.id,
    character: variant.character,
    script: variant.script,
    svgPath: variant.svgPath,
    viewBox: variant.viewBox,
    source: variant.source,
    sourceUrl: variant.sourceUrl,
    sourceCharacter: variant.sourceCharacter,
    license: variant.license,
    era: variant.era,
    confidence: variant.confidence,
    isModernSealized: variant.isModernSealized,
    noteZh: variant.noteZh,
    assetVersion: variant.assetVersion,
    assetHash: variant.assetHash,
    recommended: variant.script === preferredScript,
  }));

  return NextResponse.json(
    { ok: true, character, preferredScript, variants },
    { headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
