import { NextResponse } from "next/server";
import { checkCompliance, type ComplianceInput } from "@fangcun/compliance";
import { GLYPH_ASSET_VERSION, loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { ENGINE_VERSION, renderSeal } from "@fangcun/seal-engine";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON", message: "请求体不是有效 JSON" } },
      { status: 400 },
    );
  }
  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: { code: "DSL_NOT_OBJECT", message: "请求体必须是对象" } },
      { status: 400 },
    );
  }

  const dslInput = isRecord(body.dsl) ? body.dsl : body;
  const locale = body.locale === "en" ? "en" : "zh-Hans";
  const compliance = checkCompliance({
    text: typeof dslInput.text === "string" ? dslInput.text : "",
    dsl: dslInput as ComplianceInput["dsl"],
  });
  if (!compliance.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "COMPLIANCE_BLOCKED", findings: compliance.findings } },
      { status: 422 },
    );
  }

  const text = typeof dslInput.text === "string" ? dslInput.text : "";
  const glyphCatalog = await loadGlyphCatalogForText(text);
  const rendered = renderSeal(dslInput, glyphCatalog, { locale });
  if (!rendered.ok) return NextResponse.json(rendered, { status: 400 });

  return NextResponse.json({
    ok: true,
    svg: rendered.svg,
    dsl: rendered.dsl,
    explain: rendered.explain,
    warnings: rendered.warnings,
    missingGlyphs: rendered.missingGlyphs,
    engineVersion: ENGINE_VERSION,
    assetVersion: GLYPH_ASSET_VERSION,
  });
}
