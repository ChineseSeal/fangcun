import { NextResponse } from "next/server";
import {
  checkCompliance,
  type ComplianceInput,
} from "@fangcun/compliance";
import { GLYPH_ASSET_VERSION, loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { ENGINE_VERSION, generateSealCandidates } from "@fangcun/seal-engine";

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
      { ok: false, error: { code: "DSL_NOT_OBJECT", message: "请求体必须是有效的 JSON 对象" } },
      { status: 400 },
    );
  }
  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: { code: "DSL_NOT_OBJECT", message: "请求体必须是对象" } },
      { status: 400 },
    );
  }

  const dslInput = isRecord(body.dsl)
    ? body.dsl
    : {
        text: typeof body.text === "string" ? body.text : "",
        ...(typeof body.mode === "string" ? { mode: body.mode } : {}),
        ...(typeof body.style === "string" ? { style: body.style } : {}),
        ...(typeof body.script === "string" ? { script: body.script } : {}),
        ...(isRecord(body.shape) ? { shape: body.shape } : {}),
        ...(isRecord(body.layout) ? { layout: body.layout } : {}),
        ...(isRecord(body.border) ? { border: body.border } : {}),
        ...(isRecord(body.impression) ? { impression: body.impression } : {}),
        ...(isRecord(body.meta) ? { meta: body.meta } : {}),
      };
  const text = typeof dslInput.text === "string" ? dslInput.text : "";
  const compliance = checkCompliance({
    text,
    dsl: dslInput as ComplianceInput["dsl"],
  });

  if (!compliance.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "COMPLIANCE_BLOCKED", findings: compliance.findings } },
      { status: 422 },
    );
  }

  const glyphCatalog = await loadGlyphCatalogForText(text);
  const locale = body.locale === "en" ? "en" : "zh-Hans";
  const generated = generateSealCandidates(dslInput, glyphCatalog, { locale });
  if (!generated.ok) {
    return NextResponse.json(generated, { status: 400 });
  }

  const primary = generated.candidates[0];

  return NextResponse.json({
    ok: true,
    candidates: generated.candidates,
    seed: generated.seed,
    dsl: generated.baseDsl,
    svg: primary?.previewSvg ?? "",
    warnings: primary?.warnings ?? [],
    missingGlyphs: primary?.missingGlyphs ?? [],
    compliance: {
      decision: compliance.decision,
      findings: compliance.findings,
    },
    engineVersion: ENGINE_VERSION,
    assetVersion: GLYPH_ASSET_VERSION,
  });
}
