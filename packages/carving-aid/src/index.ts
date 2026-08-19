import type { SealDsl } from "@fangcun/dsl-schema";

const SVG_UNITS = 1_000;
const PRINT_UNITS_PER_MM = 100;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export const CARVING_DPI = 300;
export const MIRROR_TRANSFORM = "scale(-1 1) translate(-1000 0)";

export type CarvingDimensions = {
  widthMm: number;
  heightMm: number;
};

export type CarvingProof = {
  normalSvg: string;
  mirroredSvg: string;
  sheetSvg: string;
  dimensions: CarvingDimensions;
  pixelsAt300Dpi: { width: number; height: number };
  geometryHash: string;
  scaleBarMm: 10;
};

export type CarvingGuidance = {
  recommendedRangeMm: [number, number];
  recommendedSizeMm: number;
  materialLabel: string;
  stoneSummary: string;
  carvingTip: string;
  requiresSpecialistProcessing: boolean;
};

function formatMeasure(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function extractVisualContent(svg: string): string {
  const openEnd = svg.indexOf(">");
  const closeStart = svg.lastIndexOf("</svg>");
  if (!svg.trimStart().startsWith("<svg") || openEnd < 0 || closeStart <= openEnd) {
    throw new Error("CARVING_SOURCE_INVALID");
  }
  return svg
    .slice(openEnd + 1, closeStart)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/i, "")
    .replace(/#B3261E/gi, "#000000")
    .replace(/#F3EFE6/gi, "#FFFFFF");
}

export function mmToPx(sizeMm: number, dpi: number): number {
  return sizeMm / 25.4 * dpi;
}

export function unitToMm(unit: number, sizeMm: number): number {
  return unit / SVG_UNITS * sizeMm;
}

export function mirrorUnitX(x: number): number {
  return SVG_UNITS - x;
}

export function deriveFaceDimensions(dsl: SealDsl): CarvingDimensions {
  const sizeMm = dsl.physical.sizeMm;
  const ratio = dsl.shape.type === "circle" ? 1 : dsl.shape.ratio;
  if (ratio >= 1) return { widthMm: sizeMm, heightMm: sizeMm / ratio };
  return { widthMm: sizeMm * ratio, heightMm: sizeMm };
}

function createSingleProofSvg(
  visual: string,
  dimensions: CarvingDimensions,
  mirrored: boolean,
  geometryHash: string,
): string {
  const width = formatMeasure(dimensions.widthMm);
  const height = formatMeasure(dimensions.heightMm);
  const output = mirrored ? "mirror" : "normal";
  const title = mirrored ? "反稿（上石用）" : "正稿（钤出效果）";
  const content = mirrored
    ? `<g data-mirror-axis="x-500" transform="${MIRROR_TRANSFORM}">${visual}</g>`
    : visual;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 1000 1000" role="img" aria-labelledby="carving-${output}-title carving-${output}-desc" data-fangcun-output="carving-${output}" data-geometry-hash="${geometryHash}"><title id="carving-${output}-title">${title}</title><desc id="carving-${output}-desc">纯黑白 ${width} × ${height} mm 刻制辅助稿</desc>${content}</svg>`;
}

function createSheetSvg(
  visual: string,
  dimensions: CarvingDimensions,
  geometryHash: string,
): string {
  const marginMm = 8;
  const gapMm = 10;
  const labelMm = 10;
  const footerMm = 16;
  const sheetWidthMm = marginMm * 2 + dimensions.widthMm * 2 + gapMm;
  const sheetHeightMm = marginMm + labelMm + dimensions.heightMm + footerMm;
  const sheetWidth = sheetWidthMm * PRINT_UNITS_PER_MM;
  const sheetHeight = sheetHeightMm * PRINT_UNITS_PER_MM;
  const faceWidth = dimensions.widthMm * PRINT_UNITS_PER_MM;
  const faceHeight = dimensions.heightMm * PRINT_UNITS_PER_MM;
  const normalX = marginMm * PRINT_UNITS_PER_MM;
  const mirrorX = (marginMm + dimensions.widthMm + gapMm) * PRINT_UNITS_PER_MM;
  const faceY = (marginMm + labelMm) * PRINT_UNITS_PER_MM;
  const scaleX = faceWidth / SVG_UNITS;
  const scaleY = faceHeight / SVG_UNITS;
  const rulerY = faceY + faceHeight + 750;
  const rulerX = normalX;
  const rulerWidth = 10 * PRINT_UNITS_PER_MM;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatMeasure(sheetWidthMm)}mm" height="${formatMeasure(sheetHeightMm)}mm" viewBox="0 0 ${formatMeasure(sheetWidth)} ${formatMeasure(sheetHeight)}" role="img" aria-labelledby="carving-sheet-title carving-sheet-desc" data-fangcun-output="carving-sheet" data-geometry-hash="${geometryHash}"><title id="carving-sheet-title">方寸刻制辅助稿</title><desc id="carving-sheet-desc">正稿与反稿并排，按实际毫米尺寸输出，含十毫米校验标尺</desc><rect width="100%" height="100%" fill="#FFFFFF"/><text x="${formatMeasure(normalX)}" y="620" fill="#000000" font-family="serif" font-size="320">正稿（钤出效果）</text><text x="${formatMeasure(mirrorX)}" y="620" fill="#000000" font-family="serif" font-size="320">反稿（上石用）</text><g aria-label="正稿（钤出效果）" transform="translate(${formatMeasure(normalX)} ${formatMeasure(faceY)}) scale(${formatMeasure(scaleX)} ${formatMeasure(scaleY)})">${visual}</g><g aria-label="反稿（上石用）" transform="translate(${formatMeasure(mirrorX)} ${formatMeasure(faceY)}) scale(${formatMeasure(scaleX)} ${formatMeasure(scaleY)})"><g data-mirror-axis="x-500" transform="${MIRROR_TRANSFORM}">${visual}</g></g><g aria-label="10 mm 校验标尺" data-size-mm="10" fill="none" stroke="#000000" stroke-width="12"><path d="M${formatMeasure(rulerX)} ${formatMeasure(rulerY)}H${formatMeasure(rulerX + rulerWidth)}M${formatMeasure(rulerX)} ${formatMeasure(rulerY - 80)}V${formatMeasure(rulerY + 80)}M${formatMeasure(rulerX + rulerWidth)} ${formatMeasure(rulerY - 80)}V${formatMeasure(rulerY + 80)}"/></g><text x="${formatMeasure(rulerX)}" y="${formatMeasure(rulerY + 310)}" fill="#000000" font-family="sans-serif" font-size="240">10 mm 校验标尺 · 打印时请选择 100% / 实际大小</text><text x="${formatMeasure(mirrorX)}" y="${formatMeasure(rulerY + 310)}" fill="#000000" font-family="sans-serif" font-size="220">方寸 Fangcun · 刻制前请再次核对正反</text></svg>`;
}

export function createCarvingProof(dsl: SealDsl, authoritativeSvg: string): CarvingProof {
  const visual = extractVisualContent(authoritativeSvg);
  const dimensions = deriveFaceDimensions(dsl);
  const geometryHash = stableHash(visual);

  return {
    normalSvg: createSingleProofSvg(visual, dimensions, false, geometryHash),
    mirroredSvg: createSingleProofSvg(visual, dimensions, true, geometryHash),
    sheetSvg: createSheetSvg(visual, dimensions, geometryHash),
    dimensions,
    pixelsAt300Dpi: {
      width: Math.round(mmToPx(dimensions.widthMm, CARVING_DPI)),
      height: Math.round(mmToPx(dimensions.heightMm, CARVING_DPI)),
    },
    geometryHash,
    scaleBarMm: 10,
  };
}

const materialLabels: Record<SealDsl["physical"]["material"], string> = {
  qingtian: "青田石",
  shoushan: "寿山石",
  changhua: "昌化石",
  bahrain: "巴林石",
  copper: "铜",
  jade: "玉",
  wood: "木",
  ceramic: "陶",
  other: "素石",
};

const specialistMaterials = new Set<SealDsl["physical"]["material"]>([
  "copper",
  "jade",
  "wood",
  "ceramic",
]);

export function createCarvingGuidance(dsl: SealDsl): CarvingGuidance {
  const count = Array.from(dsl.text).length;
  const baseRange: [number, number] = count <= 1
    ? [12, 20]
    : count === 2
      ? [15, 25]
      : count <= 4
        ? [18, 30]
        : [25, 40];
  const densityBonus = dsl.mode === "yin" && dsl.layout.density > 0.8 ? 3 : 0;
  const recommendedRangeMm: [number, number] = [
    baseRange[0] + densityBonus,
    baseRange[1] + densityBonus,
  ];
  const recommendedSizeMm = Math.round((recommendedRangeMm[0] + recommendedRangeMm[1]) / 2);
  const materialLabel = materialLabels[dsl.physical.material];
  const requiresSpecialistProcessing = specialistMaterials.has(dsl.physical.material);

  return {
    recommendedRangeMm,
    recommendedSizeMm,
    materialLabel,
    stoneSummary: requiresSpecialistProcessing
      ? `建议 ${recommendedSizeMm} mm 见方${materialLabel}材`
      : `建议 ${recommendedSizeMm} mm 见方${materialLabel}`,
    carvingTip: requiresSpecialistProcessing
      ? "铜、玉、木、陶请交专业工坊按反稿加工，勿按印石刀法直接操作。"
      : dsl.mode === "yin" ? "白文先刻笔画，落刀前核对反稿。" : "朱文先刻底，保留印文线条。",
    requiresSpecialistProcessing,
  };
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) * 16_777_216)
    + ((bytes[offset + 1] ?? 0) << 16)
    + ((bytes[offset + 2] ?? 0) << 8)
    + (bytes[offset + 3] ?? 0);
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value >>> 24;
  bytes[offset + 1] = value >>> 16;
  bytes[offset + 2] = value >>> 8;
  bytes[offset + 3] = value;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createDensityChunk(dpi: number): Uint8Array {
  const type = new TextEncoder().encode("pHYs");
  const data = new Uint8Array(9);
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  writeUint32(data, 0, pixelsPerMeter);
  writeUint32(data, 4, pixelsPerMeter);
  data[8] = 1;
  const chunk = new Uint8Array(4 + type.length + data.length + 4);
  writeUint32(chunk, 0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

export function injectPngDensity(png: Uint8Array, dpi = CARVING_DPI): Uint8Array {
  if (png.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((byte, index) => png[index] === byte)) {
    throw new Error("PNG_SIGNATURE_INVALID");
  }
  const chunks: Uint8Array[] = [png.slice(0, 8)];
  const densityChunk = createDensityChunk(dpi);
  let offset = 8;
  let densityInserted = false;

  while (offset + 12 <= png.length) {
    const length = readUint32(png, offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > png.length) throw new Error("PNG_CHUNK_INVALID");
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    if (type === "IDAT" && !densityInserted) {
      chunks.push(densityChunk);
      densityInserted = true;
    }
    if (type !== "pHYs") chunks.push(png.slice(offset, chunkEnd));
    offset = chunkEnd;
  }
  if (!densityInserted) throw new Error("PNG_IDAT_MISSING");

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let outputOffset = 0;
  for (const chunk of chunks) {
    output.set(chunk, outputOffset);
    outputOffset += chunk.length;
  }
  return output;
}
