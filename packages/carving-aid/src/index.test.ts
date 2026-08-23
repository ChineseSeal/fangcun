import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import {
  CARVING_DPI,
  MIRROR_TRANSFORM,
  createCarvingGuidance,
  createCarvingProof,
  deriveFaceDimensions,
  injectPngDensity,
  mirrorUnitX,
  mmToPx,
  unitToMm,
} from "./index";

function makeDsl(overrides: Partial<SealDsl> = {}): SealDsl {
  const normalized = normalizeSealDsl({ text: "方寸" });
  if (!normalized.ok) throw new Error("fixture DSL invalid");
  return { ...normalized.value, ...overrides };
}

const sourceSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><title>原稿</title><desc>说明</desc><rect width="1000" height="1000" fill="#F3EFE6"/><path data-char="方" d="M100 200H300V400H100Z" fill="#B3261E"/></svg>';

function pngChunk(type: string, data: number[] = []): Uint8Array {
  const output = new Uint8Array(12 + data.length);
  const encodedType = new TextEncoder().encode(type);
  output[3] = data.length;
  output.set(encodedType, 4);
  output.set(data, 8);
  return output;
}

describe("carving aid", () => {
  it("G17 · mirrors the exact source geometry across x=500", () => {
    const proof = createCarvingProof(makeDsl(), sourceSvg);

    expect(MIRROR_TRANSFORM).toBe("scale(-1 1) translate(-1000 0)");
    expect(proof.mirroredSvg).toContain(`transform="${MIRROR_TRANSFORM}"`);
    expect(proof.normalSvg).toContain('d="M100 200H300V400H100Z"');
    expect(proof.mirroredSvg).toContain('d="M100 200H300V400H100Z"');
    expect(proof.normalSvg).toContain(`data-geometry-hash="${proof.geometryHash}"`);
    expect(proof.mirroredSvg).toContain(`data-geometry-hash="${proof.geometryHash}"`);
    expect([0, 100, 500, 875, 1000].map(mirrorUnitX)).toEqual([1000, 900, 500, 125, 0]);
    expect([0, 100, 500, 875, 1000].map((x) => mirrorUnitX(mirrorUnitX(x)))).toEqual([0, 100, 500, 875, 1000]);
  });

  it("creates pure black-and-white, real-size SVGs and a labeled print sheet", () => {
    const proof = createCarvingProof(makeDsl({ physical: { sizeMm: 25, material: "qingtian" } }), sourceSvg);

    expect(proof.normalSvg).toContain('width="25mm" height="25mm"');
    expect(proof.normalSvg).toContain("#000000");
    expect(proof.normalSvg).toContain("#FFFFFF");
    expect(proof.normalSvg).not.toMatch(/#B3261E|#F3EFE6/i);
    expect(proof.sheetSvg).toContain("正稿（钤出效果）");
    expect(proof.sheetSvg).toContain("反稿（上石用）");
    expect(proof.sheetSvg).toContain('data-size-mm="10"');
    expect(proof.pixelsAt300Dpi).toEqual({ width: 295, height: 295 });
  });

  it("uses DSL ratio for dimensions and deterministic size guidance", () => {
    const dsl = makeDsl({
      shape: { type: "rect", ratio: 2 },
      mode: "yin",
      layout: { strategy: "vertical_2", density: 0.9, readingOrder: "traditional" },
      physical: { sizeMm: 30, material: "shoushan" },
    });

    expect(deriveFaceDimensions(dsl)).toEqual({ widthMm: 30, heightMm: 15 });
    expect(createCarvingGuidance(dsl)).toEqual({
      recommendedRangeMm: [18, 28],
      recommendedSizeMm: 23,
      materialLabel: "寿山石",
      stoneSummary: "建议 23 mm 见方寿山石",
      carvingTip: "白文先刻笔画，落刀前核对反稿。",
      requiresSpecialistProcessing: false,
    });
    expect(mmToPx(25.4, CARVING_DPI)).toBe(300);
    expect(unitToMm(400, 25)).toBe(10);
  });

  it("routes metal, jade, wood, and ceramic bodies to specialist fabrication", () => {
    const guidance = createCarvingGuidance(makeDsl({
      physical: { sizeMm: 25, material: "copper" },
    }));

    expect(guidance).toMatchObject({
      materialLabel: "铜",
      requiresSpecialistProcessing: true,
      stoneSummary: "建议 20 mm 见方铜材",
    });
    expect(guidance.carvingTip).toContain("专业工坊");
  });

  it("replaces PNG density metadata with the requested DPI", () => {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const source = new Uint8Array([
      ...signature,
      ...pngChunk("IHDR"),
      ...pngChunk("pHYs", [0, 0, 0, 1, 0, 0, 0, 1, 1]),
      ...pngChunk("IDAT"),
      ...pngChunk("IEND"),
    ]);
    const output = injectPngDensity(source, 300);
    const text = new TextDecoder().decode(output);
    const densityOffset = text.indexOf("pHYs") + 4;
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength);

    expect(text.match(/pHYs/g)).toHaveLength(1);
    expect(view.getUint32(densityOffset)).toBe(11811);
    expect(view.getUint32(densityOffset + 4)).toBe(11811);
    expect(output[densityOffset + 8]).toBe(1);
  });
});
