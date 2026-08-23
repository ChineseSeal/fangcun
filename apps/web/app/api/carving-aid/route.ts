import { NextResponse } from "next/server";
import { createCarvingGuidance, createCarvingProof } from "@fangcun/carving-aid";
import { checkCompliance, type ComplianceInput } from "@fangcun/compliance";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { renderSeal } from "@fangcun/seal-engine";

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
  const output = body.output === "pdf" ? "pdf" : "json";
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
  const normalized = renderSeal(dslInput, glyphCatalog);
  if (!normalized.ok) return NextResponse.json(normalized, { status: 400 });

  const carvingDsl = {
    ...normalized.dsl,
    impression: {
      ...normalized.dsl.impression,
      distress: 0,
      inkUneven: 0,
      bleed: 0,
    },
    paste: { color: "black" as const, opacity: 1 },
    paper: { color: "xuan" as const, texture: 0 },
  };
  const rendered = renderSeal(carvingDsl, glyphCatalog);
  if (!rendered.ok) return NextResponse.json(rendered, { status: 400 });

  const proof = createCarvingProof(rendered.dsl, rendered.svg);
  if (output === "pdf") {
    const { createCarvingProofPdf, deriveCarvingPdfPage } = await import("@fangcun/carving-aid/pdf");
    const page = deriveCarvingPdfPage(proof);
    const pdf = await createCarvingProofPdf(proof);
    const bodyBuffer = pdf.buffer.slice(
      pdf.byteOffset,
      pdf.byteOffset + pdf.byteLength,
    ) as ArrayBuffer;
    return new Response(bodyBuffer, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="fangcun-carving-proof-${rendered.dsl.physical.sizeMm}mm.pdf"`,
        "content-type": "application/pdf",
        "x-fangcun-geometry-hash": proof.geometryHash,
        "x-fangcun-page-mm": `${page.widthMm}x${page.heightMm}`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    proof,
    guidance: createCarvingGuidance(rendered.dsl),
  }, { headers: { "cache-control": "no-store" } });
}
