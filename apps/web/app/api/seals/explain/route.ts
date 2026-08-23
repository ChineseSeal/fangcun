import { NextResponse } from "next/server";
import { GLYPH_ASSET_VERSION, loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { ENGINE_VERSION, renderSeal } from "@fangcun/seal-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const text = typeof body === "object" && body !== null && "text" in body && typeof body.text === "string"
    ? body.text
    : "";
  const glyphCatalog = await loadGlyphCatalogForText(text);
  const locale = typeof body === "object" && body !== null && "locale" in body && body.locale === "en"
    ? "en"
    : "zh-Hans";
  const rendered = renderSeal(body, glyphCatalog, { locale });
  if (!rendered.ok) {
    return NextResponse.json(rendered, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    explain: rendered.explain,
    warnings: rendered.warnings,
    engineVersion: ENGINE_VERSION,
    assetVersion: GLYPH_ASSET_VERSION,
  });
}
