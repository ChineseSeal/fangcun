import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import {
  loadGlyphs,
  type GlyphConfidence,
  type GlyphVariant,
  type GlyphLoadResult,
  type GlyphScript,
} from "@fangcun/glyph-tools";

/** Runtime engine contract surfaced by APIs and persisted project versions. */
export const ENGINE_VERSION = "0.1.0";

export type ExplainAnnotation = {
  kind: "border" | "density" | "distress" | "grid" | "imprint" | "whitespace";
  termSlug: string;
  path: string;
};

export type ExplainFacts = {
  charCount: number;
  mode: SealDsl["mode"];
  modeTermSlug: "baiwen" | "zhuwen";
  style: string;
  styleTermSlug: string;
  layoutStrategy: string;
  layoutTermSlug: "zhangfa";
  densityBand: "sparse" | "balanced" | "full";
  densityTermSlug: "zhangfa" | "manbai";
  readingOrder: string[];
  readingOrderTermSlug: "huiwen" | null;
  distressBand: "none" | "slight" | "strong";
  borderType: SealDsl["border"]["type"];
  glyphSources: Array<{
    char: string;
    script: GlyphScript;
    confidence: GlyphConfidence;
    source: string;
    fallbackLevel: GlyphLoadResult["fallbackLevel"];
  }>;
  annotations: ExplainAnnotation[];
};

export type RenderedSeal = {
  ok: true;
  svg: string;
  dsl: SealDsl;
  explain: ExplainFacts;
  warnings: string[];
  missingGlyphs: string[];
};

export type RenderSealResult =
  | RenderedSeal
  | { ok: false; errors: Array<{ code: string; path: string; message: string }> };

export type RenderSealOptions = {
  locale?: "zh-Hans" | "en";
};

type Cell = { x: number; y: number; scale: number };

const colors = {
  paper: "#F3EFE6",
  cinnabar: "#B3261E",
} as const;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellFor(
  index: number,
  count: number,
  strategy: string,
  readingOrder: SealDsl["layout"]["readingOrder"],
): Cell {
  if (count <= 1 || strategy === "single") return { x: 260, y: 260, scale: 0.48 };
  if (strategy === "horizontal_2" || strategy === "two_col") {
    if (count === 2) {
      const firstX = readingOrder === "modern" ? 30 : 510;
      return { x: index === 0 ? firstX : 540 - firstX, y: 260, scale: 0.42 };
    }
    return { x: index % 2 === 0 ? 30 : 510, y: index < 2 ? 30 : 510, scale: 0.36 };
  }
  if (strategy === "ring") {
    const ringCells: Cell[] = [
      { x: 260, y: 30, scale: 0.34 },
      { x: 510, y: 260, scale: 0.34 },
      { x: 260, y: 510, scale: 0.34 },
      { x: 30, y: 260, scale: 0.34 },
    ];
    return ringCells[index % ringCells.length];
  }
  if (strategy === "freeform" || strategy === "guxi_3") {
    const freeformCells: Cell[] = [
      { x: 410, y: 30, scale: 0.41 },
      { x: 35, y: 330, scale: 0.34 },
      { x: 465, y: 520, scale: 0.37 },
    ];
    return freeformCells[index % freeformCells.length];
  }
  if (strategy === "horizontal_3") {
    return { x: 15 + index * 325, y: 350, scale: 0.3 };
  }
  if (count === 2) return { x: 260, y: index === 0 ? 30 : 510, scale: 0.42 };
  if (count === 3) return { x: 260, y: 10 + index * 330, scale: 0.31 };
  const column = index % 2;
  const row = Math.floor(index / 2);
  if (strategy === "huiwen" || readingOrder === "huiwen") {
    const huiwenCells: Cell[] = [
      { x: 520, y: 40, scale: 0.43 },
      { x: 520, y: 520, scale: 0.43 },
      { x: 40, y: 40, scale: 0.43 },
      { x: 40, y: 520, scale: 0.43 },
    ];
    return huiwenCells[index % huiwenCells.length];
  }
  return { x: column === 0 ? 40 : 520, y: row === 0 ? 40 : 520, scale: 0.43 };
}

function fallbackPath(): string {
  return "M150 150H850V850H150ZM210 210V790H790V210ZM270 320L320 270L730 680L680 730ZM680 270L730 320L320 730L270 680Z";
}

function glyphPath(result: GlyphLoadResult): string {
  return result.ok ? result.variant.svgPath : fallbackPath();
}

function renderGlyphs(
  dsl: SealDsl,
  loaded: GlyphLoadResult[],
  foreground: string,
): string {
  return loaded
    .map((result, index) => {
      const cell = cellFor(
        index,
        loaded.length,
        dsl.layout.strategy,
        dsl.layout.readingOrder,
      );
      const ref = dsl.glyphs[index];
      const densityScale = dsl.layout.density > 0.8
        ? 1 + (dsl.layout.density - 0.8) * 0.75
        : 1;
      const scaleX = cell.scale * densityScale * (ref?.scaleX ?? 1);
      const scaleY = cell.scale * densityScale * (ref?.scaleY ?? 1);
      const dx = (ref?.dx ?? 0) * 520;
      const dy = (ref?.dy ?? 0) * 520;
      const rotate = ref?.rotate ?? 0;
      const label = result.char;
      return (
        '<path data-char="' +
        xmlEscape(label) +
        '" data-glyph-status="' +
        (result.ok ? result.fallbackLevel : "missing") +
        '" d="' +
        glyphPath(result) +
        '" transform="translate(' +
        (cell.x + dx).toFixed(4) +
        " " +
        (cell.y + dy).toFixed(4) +
        ") scale(" +
        scaleX.toFixed(6) +
        " " +
        scaleY.toFixed(6) +
        ") rotate(" +
        rotate.toFixed(4) +
        ' 500 500)" fill="' +
        foreground +
        '" fill-rule="evenodd"/>'
      );
    })
    .join("");
}

function seededUnit(seed: number, channel: number): number {
  let value = (seed ^ Math.imul(channel + 1, 2_654_435_761)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2_246_822_519);
  value = Math.imul(value ^ (value >>> 13), 3_266_489_917);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

function renderDistressMask(dsl: SealDsl): string {
  if (dsl.impression.distress < 0.5) return "";
  const count = 10 + Math.round(dsl.impression.distress * 10);
  const holes = Array.from({ length: count }, (_, index) => {
    const x = 90 + seededUnit(dsl.impression.seed, index * 3) * 820;
    const y = 90 + seededUnit(dsl.impression.seed, index * 3 + 1) * 820;
    const radius = 8 + seededUnit(dsl.impression.seed, index * 3 + 2) * 22;
    return '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + radius.toFixed(2) + '" fill="black"/>';
  }).join("");
  return '<defs><mask id="seal-distress"><rect width="1000" height="1000" fill="white"/>' + holes + "</mask></defs>";
}

function retainedInkEstimate(distress: number): number {
  return Math.max(0.7, 1 - distress * 0.3);
}

function renderGrid(dsl: SealDsl, stroke: string): string {
  if (dsl.grid.type === "none") return "";
  const strokeWidth = (dsl.grid.width * 1000).toFixed(2);
  const path =
    dsl.grid.type === "ri"
      ? "M38 333H962M38 666H962M333 38V962M666 38V962"
      : "M500 38V962M38 500H962";
  return '<path d="' + path + '" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"/>';
}

function borderAnnotationPath(dsl: SealDsl): string {
  if (dsl.shape.type === "circle") return "M500 40A460 460 0 1 1 499.99 40";
  if (dsl.border.type === "irregular") return "M54 42L951 57L963 944L45 960L54 42Z";
  return "M38 38H962V962H38Z";
}

function gridAnnotationPath(dsl: SealDsl): string | null {
  if (dsl.grid.type === "none") return null;
  return dsl.grid.type === "ri"
    ? "M38 333H962M38 666H962M333 38V962M666 38V962"
    : "M500 38V962M38 500H962";
}

function glyphAnnotationPath(dsl: SealDsl): string {
  return dsl.glyphs.map((glyph, index) => {
    const cell = cellFor(index, dsl.glyphs.length, dsl.layout.strategy, dsl.layout.readingOrder);
    const densityScale = dsl.layout.density > 0.8
      ? 1 + (dsl.layout.density - 0.8) * 0.75
      : 1;
    const scaleX = cell.scale * densityScale * glyph.scaleX;
    const scaleY = cell.scale * densityScale * glyph.scaleY;
    const dx = glyph.dx * 520;
    const dy = glyph.dy * 520;
    const x1 = cell.x + dx + 110 * scaleX;
    const y1 = cell.y + dy + 110 * scaleY;
    const x2 = cell.x + dx + 890 * scaleX;
    const y2 = cell.y + dy + 890 * scaleY;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}H${x2.toFixed(2)}V${y2.toFixed(2)}H${x1.toFixed(2)}Z`;
  }).join("");
}

function whitespaceAnnotationPath(dsl: SealDsl): string {
  if (dsl.layout.strategy === "horizontal_2") return "M455 90H545V910H455Z";
  if (dsl.layout.strategy === "vertical_2" || dsl.glyphs.length === 2) return "M90 455H910V545H90Z";
  if (dsl.glyphs.length >= 4) return "M425 425H575V575H425Z";
  return dsl.shape.type === "circle"
    ? "M500 105A395 395 0 1 1 499.99 105M500 220A280 280 0 1 0 500.01 220"
    : "M105 105H895V895H105ZM220 220V780H780V220Z";
}

function densityAnnotationPath(dsl: SealDsl): string {
  const centers = dsl.glyphs.map((glyph, index) => {
    const cell = cellFor(index, dsl.glyphs.length, dsl.layout.strategy, dsl.layout.readingOrder);
    const densityScale = dsl.layout.density > 0.8
      ? 1 + (dsl.layout.density - 0.8) * 0.75
      : 1;
    return {
      x: cell.x + glyph.dx * 520 + 500 * cell.scale * densityScale * glyph.scaleX,
      y: cell.y + glyph.dy * 520 + 500 * cell.scale * densityScale * glyph.scaleY,
    };
  });
  const center = centers.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 },
  );
  const x = center.x / Math.max(1, centers.length);
  const y = center.y / Math.max(1, centers.length);
  return `M${(x - 72).toFixed(2)} ${y.toFixed(2)}H${(x + 72).toFixed(2)}M${x.toFixed(2)} ${(y - 72).toFixed(2)}V${(y + 72).toFixed(2)}M${(x - 46).toFixed(2)} ${y.toFixed(2)}A46 46 0 1 0 ${(x + 46).toFixed(2)} ${y.toFixed(2)}A46 46 0 1 0 ${(x - 46).toFixed(2)} ${y.toFixed(2)}`;
}

function distressAnnotationPath(dsl: SealDsl): string | null {
  if (dsl.impression.distress < 0.5) return null;
  const count = 10 + Math.round(dsl.impression.distress * 10);
  return Array.from({ length: count }, (_, index) => {
    const x = 90 + seededUnit(dsl.impression.seed, index * 3) * 820;
    const y = 90 + seededUnit(dsl.impression.seed, index * 3 + 1) * 820;
    const radius = 8 + seededUnit(dsl.impression.seed, index * 3 + 2) * 22;
    return `M${(x - radius).toFixed(2)} ${y.toFixed(2)}A${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(x + radius).toFixed(2)} ${y.toFixed(2)}A${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(x - radius).toFixed(2)} ${y.toFixed(2)}`;
  }).join("");
}

function styleTermSlug(style: string): string {
  if (style.includes("guxi")) return "guxi";
  if (style.includes("qin")) return "qin-seal";
  if (style.includes("bird") || style.includes("niao")) return "niaochong";
  if (style.includes("literati") || style.includes("ming")) return "xianzhang";
  return "han-seal";
}

function readingOrderFacts(dsl: SealDsl): string[] {
  if (dsl.layout.readingOrder === "huiwen" && dsl.glyphs.length === 4) {
    return ["右上", "右下", "左上", "左下"];
  }
  if (dsl.layout.strategy === "horizontal_2" && dsl.glyphs.length === 2) {
    return dsl.layout.readingOrder === "modern" ? ["左", "右"] : ["右", "左"];
  }
  if (dsl.layout.strategy === "vertical_2" && dsl.glyphs.length === 2) {
    return ["上", "下"];
  }
  return dsl.glyphs.map((_, index) => "第" + (index + 1) + "字");
}

function explainSeal(dsl: SealDsl, loaded: GlyphLoadResult[]): ExplainFacts {
  const gridPath = gridAnnotationPath(dsl);
  const distressPath = distressAnnotationPath(dsl);
  return {
    charCount: dsl.glyphs.length,
    mode: dsl.mode,
    modeTermSlug: dsl.mode === "yin" ? "baiwen" : "zhuwen",
    style: dsl.style,
    styleTermSlug: styleTermSlug(dsl.style),
    layoutStrategy: dsl.layout.strategy,
    layoutTermSlug: "zhangfa",
    densityBand: dsl.layout.density >= 0.84 ? "full" : dsl.layout.density <= 0.5 ? "sparse" : "balanced",
    densityTermSlug: dsl.layout.density >= 0.84 ? "manbai" : "zhangfa",
    readingOrder: readingOrderFacts(dsl),
    readingOrderTermSlug: dsl.layout.readingOrder === "huiwen" ? "huiwen" : null,
    distressBand: dsl.impression.distress === 0 ? "none" : dsl.impression.distress < 0.5 ? "slight" : "strong",
    borderType: dsl.border.type,
    glyphSources: loaded.map((result) =>
      result.ok
        ? {
            char: result.char,
            script: result.variant.script,
            confidence: result.variant.confidence,
            source: result.variant.source,
            fallbackLevel: result.fallbackLevel,
          }
        : {
            char: result.char,
            script: dsl.script,
            confidence: "generated",
            source: "fallback",
            fallbackLevel: result.fallbackLevel,
          },
    ),
    annotations: [
      ...(dsl.border.type === "none" ? [] : [{ kind: "border" as const, termSlug: "yinbian", path: borderAnnotationPath(dsl) }]),
      { kind: "imprint", termSlug: dsl.mode === "yin" ? "baiwen" : "zhuwen", path: glyphAnnotationPath(dsl) },
      { kind: "whitespace", termSlug: "zhangfa", path: whitespaceAnnotationPath(dsl) },
      { kind: "density", termSlug: dsl.layout.density >= 0.84 ? "manbai" : "zhangfa", path: densityAnnotationPath(dsl) },
      ...(gridPath ? [{ kind: "grid" as const, termSlug: "jiege", path: gridPath }] : []),
      ...(distressPath ? [{ kind: "distress" as const, termSlug: "cansun", path: distressPath }] : []),
    ],
  };
}

function renderBorder(dsl: SealDsl, stroke: string): string {
  if (dsl.border.type === "none") return "";
  const baseWidth = dsl.border.width * 1000;
  const strokeWidth = (dsl.border.type === "thick" ? Math.max(72, baseWidth) : baseWidth).toFixed(2);
  if (dsl.shape.type === "circle") {
    return '<circle cx="500" cy="500" r="460" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"/>';
  }
  if (dsl.border.type === "irregular") {
    return '<path d="M54 42L951 57L963 944L45 960L54 42Z" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linejoin="round"/>';
  }
  if (dsl.border.type === "double") {
    return '<rect x="38" y="38" width="924" height="924" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"/><rect x="82" y="82" width="836" height="836" fill="none" stroke="' + stroke + '" stroke-width="' + (baseWidth * 0.55).toFixed(2) + '"/>';
  }
  return '<rect x="38" y="38" width="924" height="924" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"/>';
}

function renderBackground(dsl: SealDsl, fill: string): string {
  if (dsl.mode === "yang" && dsl.paper.color === "none") return "";
  if (dsl.shape.type === "circle") {
    return '<circle cx="500" cy="500" r="480" fill="' + fill + '"/>';
  }
  if (dsl.shape.type === "ellipse") {
    return '<ellipse cx="500" cy="500" rx="470" ry="360" fill="' + fill + '"/>';
  }
  return '<rect width="1000" height="1000" fill="' + fill + '"/>';
}

export function renderSeal(
  input: unknown,
  catalog: readonly GlyphVariant[],
  options: RenderSealOptions = {},
): RenderSealResult {
  const normalized = normalizeSealDsl(input);
  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors.map(({ code, path, message }) => ({ code, path, message })),
    };
  }

  const dsl = normalized.value;
  const requestedVariantIds = dsl.glyphs.map((glyph) => glyph.variantId);
  const loaded = loadGlyphs(dsl.text, dsl.script, catalog, requestedVariantIds);
  const missingGlyphs = loaded.filter((result) => !result.ok).map((result) => result.char);
  const warnings = [
    ...normalized.warnings.map((warning) => warning.code),
    ...loaded.flatMap((result) => {
      if (!result.ok) return [];
      if (result.fallbackLevel === "modern_sealization" || result.variant.isModernSealized) {
        return [`MODERN_SEALIZATION:${result.char}`];
      }
      if (result.fallbackLevel === "related_script") {
        return [`SCRIPT_FALLBACK:${result.char}:${result.variant.script}`];
      }
      return [];
    }),
    ...missingGlyphs.map((char) => "MISSING_GLYPH:" + char),
  ];
  const foreground = dsl.mode === "yin" ? colors.paper : colors.cinnabar;
  const background = dsl.mode === "yin" ? colors.cinnabar : colors.paper;
  const english = options.locale === "en";
  const title = english ? `Fangcun seal: ${dsl.text}` : "方寸印面 " + dsl.text;
  const desc = english
    ? dsl.mode === "yin"
      ? "Baiwen intaglio seal. The inscription is recessed and the SVG output is deterministic."
      : "Zhuwen relief seal. The inscription is raised and the SVG output is deterministic."
    : dsl.mode === "yin"
      ? "白文印面，印文凹陷，当前输出为确定性 SVG。"
      : "朱文印面，印文凸起，当前输出为确定性 SVG。";
  const distressMask = renderDistressMask(dsl);
  const maskAttribute = distressMask ? ' mask="url(#seal-distress)"' : "";

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-labelledby="seal-title seal-desc" data-retained-ink="' +
    retainedInkEstimate(dsl.impression.distress).toFixed(4) +
    '">' +
    '<title id="seal-title">' +
    xmlEscape(title) +
    "</title>" +
    '<desc id="seal-desc">' +
    xmlEscape(desc) +
    "</desc>" +
    distressMask +
    "<g" + maskAttribute + ">" +
    renderBackground(dsl, background) +
    renderBorder(dsl, foreground) +
    renderGrid(dsl, foreground) +
    `<g aria-label="${english ? "seal inscription" : "印文"}">` +
    renderGlyphs(dsl, loaded, foreground) +
    "</g></g></svg>";

  return { ok: true, svg, dsl, explain: explainSeal(dsl, loaded), warnings, missingGlyphs };
}

export type { SealDsl } from "@fangcun/dsl-schema";
export { generateSealCandidates, relayoutSeal } from "./generate";
export type {
  GenerateCandidate,
  GenerateCandidatesResult,
  RelayoutSealResult,
  SealDslPatch,
} from "./generate";
export {
  explainFactFingerprint,
  formatExplainFacts,
  type ExplainLocale,
  type ExplainPresentation,
} from "./explain";
