import type { GlyphScript, GlyphVariant } from "./index";
import { GLYPH_ASSET_VERSION } from "./variant-factory";

type StyleProfile = {
  script: Exclude<GlyphScript, "xiaozhuan">;
  labelZh: string;
  era: string;
  scaleX: number;
  scaleY: number;
  rotate: number;
  skewX: number;
  flattenCurves: boolean;
  quantize: number;
  ornament: "none" | "bronze-nodes" | "bird-eyes";
  stretchLimits: GlyphVariant["stretchLimits"];
};

export const MODERN_STYLE_PROFILES: readonly StyleProfile[] = [
  {
    script: "jiaguwen",
    labelZh: "甲骨文",
    era: "商代甲骨刻辞视觉特征；现代规则扩展",
    scaleX: 0.78,
    scaleY: 1.08,
    rotate: -2.5,
    skewX: -0.03,
    flattenCurves: true,
    quantize: 3,
    ornament: "none",
    stretchLimits: { x: [0.9, 1.12], y: [0.9, 1.12] },
  },
  {
    script: "jinwen",
    labelZh: "金文",
    era: "商周青铜器铭文视觉特征；现代规则扩展",
    scaleX: 1.04,
    scaleY: 1.04,
    rotate: 1.2,
    skewX: 0.02,
    flattenCurves: false,
    quantize: 1,
    ornament: "bronze-nodes",
    stretchLimits: { x: [0.84, 1.16], y: [0.84, 1.16] },
  },
  {
    script: "guxi",
    labelZh: "古玺",
    era: "战国古玺视觉特征；现代规则扩展",
    scaleX: 0.92,
    scaleY: 1.02,
    rotate: -3,
    skewX: 0.08,
    flattenCurves: false,
    quantize: 2,
    ornament: "none",
    stretchLimits: { x: [0.8, 1.2], y: [0.82, 1.18] },
  },
  {
    script: "han_seal",
    labelZh: "汉印篆",
    era: "秦汉印章方整平满视觉特征；现代规则扩展",
    scaleX: 1.12,
    scaleY: 0.82,
    rotate: 0,
    skewX: 0,
    flattenCurves: true,
    quantize: 8,
    ornament: "none",
    stretchLimits: { x: [0.78, 1.18], y: [0.92, 1.1] },
  },
  {
    script: "bird_worm",
    labelZh: "鸟虫篆",
    era: "战国至汉鸟虫书装饰视觉特征；现代规则扩展",
    scaleX: 0.76,
    scaleY: 1.1,
    rotate: 2,
    skewX: -0.05,
    flattenCurves: false,
    quantize: 1,
    ornament: "bird-eyes",
    stretchLimits: { x: [0.9, 1.1], y: [0.88, 1.1] },
  },
] as const;

const commandArity: Readonly<Record<string, number>> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

const pathTokenPattern = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

type TransformProfile = Pick<StyleProfile, "scaleX" | "scaleY" | "rotate" | "skewX" | "flattenCurves" | "quantize">;
type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

function matrixFor(profile: TransformProfile): Matrix {
  const radians = profile.rotate * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const a = cosine * profile.scaleX;
  const b = sine * profile.scaleX;
  const c = cosine * profile.skewX - sine * profile.scaleY;
  const d = sine * profile.skewX + cosine * profile.scaleY;
  return {
    a,
    b,
    c,
    d,
    e: 500 - a * 500 - c * 500,
    f: 500 - b * 500 - d * 500,
  };
}

function mapPoint(x: number, y: number, matrix: Matrix, quantize: number): [number, number] {
  const mappedX = matrix.a * x + matrix.c * y + matrix.e;
  const mappedY = matrix.b * x + matrix.d * y + matrix.f;
  const step = Math.max(0.01, quantize);
  return [
    Math.round(mappedX / step) * step,
    Math.round(mappedY / step) * step,
  ];
}

export function transformGlyphPath(path: string, profile: TransformProfile): string {
  const tokens = path.match(pathTokenPattern) ?? [];
  const output: string[] = [];
  const matrix = matrixFor(profile);
  let index = 0;
  let currentX = 0;
  let currentY = 0;
  let subpathX = 0;
  let subpathY = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    if (!command || !/[A-Za-z]/.test(command)) {
      throw new Error("Glyph path must use explicit SVG commands");
    }
    if (command !== command.toUpperCase() || !(command in commandArity)) {
      throw new Error(`Unsupported glyph path command: ${command}`);
    }
    index += 1;
    const arity = commandArity[command] ?? 0;
    if (arity === 0) {
      output.push(command);
      currentX = subpathX;
      currentY = subpathY;
      continue;
    }
    let groupIndex = 0;
    while (index < tokens.length && !/[A-Za-z]/.test(tokens[index] ?? "")) {
      const values = tokens.slice(index, index + arity).map(Number);
      if (values.length !== arity || values.some((value) => !Number.isFinite(value))) {
        throw new Error(`Invalid ${command} command in glyph path`);
      }
      let outputCommand = command;
      let outputValues: number[];
      if (command === "H") {
        currentX = values[0] ?? currentX;
        outputCommand = "L";
        outputValues = mapPoint(currentX, currentY, matrix, profile.quantize);
      } else if (command === "V") {
        currentY = values[0] ?? currentY;
        outputCommand = "L";
        outputValues = mapPoint(currentX, currentY, matrix, profile.quantize);
      } else if (command === "M" || command === "L" || command === "T") {
        currentX = values[0] ?? currentX;
        currentY = values[1] ?? currentY;
        outputCommand = command === "M" && groupIndex === 0 ? "M" : profile.flattenCurves && command === "T" ? "L" : command === "M" ? "L" : command;
        outputValues = mapPoint(currentX, currentY, matrix, profile.quantize);
        if (command === "M" && groupIndex === 0) {
          subpathX = currentX;
          subpathY = currentY;
        }
      } else if (command === "C") {
        currentX = values[4] ?? currentX;
        currentY = values[5] ?? currentY;
        outputCommand = profile.flattenCurves ? "L" : "C";
        outputValues = profile.flattenCurves
          ? mapPoint(currentX, currentY, matrix, profile.quantize)
          : [
              ...mapPoint(values[0] ?? 0, values[1] ?? 0, matrix, profile.quantize),
              ...mapPoint(values[2] ?? 0, values[3] ?? 0, matrix, profile.quantize),
              ...mapPoint(currentX, currentY, matrix, profile.quantize),
            ];
      } else if (command === "S" || command === "Q") {
        currentX = values[2] ?? currentX;
        currentY = values[3] ?? currentY;
        outputCommand = profile.flattenCurves ? "L" : command;
        outputValues = profile.flattenCurves
          ? mapPoint(currentX, currentY, matrix, profile.quantize)
          : [
              ...mapPoint(values[0] ?? 0, values[1] ?? 0, matrix, profile.quantize),
              ...mapPoint(currentX, currentY, matrix, profile.quantize),
            ];
      } else if (command === "A") {
        currentX = values[5] ?? currentX;
        currentY = values[6] ?? currentY;
        const endpoint = mapPoint(currentX, currentY, matrix, profile.quantize);
        outputValues = [
          Math.abs((values[0] ?? 0) * profile.scaleX),
          Math.abs((values[1] ?? 0) * profile.scaleY),
          (values[2] ?? 0) + profile.rotate,
          values[3] ?? 0,
          values[4] ?? 0,
          ...endpoint,
        ];
      } else {
        outputValues = values;
      }
      output.push(outputCommand, ...outputValues.map(formatNumber));
      index += arity;
      groupIndex += 1;
    }
  }
  return output.join(" ");
}

function stableHash(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return (left >>> 0).toString(16).padStart(8, "0") + (right >>> 0).toString(16).padStart(8, "0");
}

function diamondRing(centerX: number, centerY: number, outer: number, inner: number): string {
  return [
    `M${formatNumber(centerX)} ${formatNumber(centerY - outer)}`,
    `L${formatNumber(centerX + outer)} ${formatNumber(centerY)}`,
    `L${formatNumber(centerX)} ${formatNumber(centerY + outer)}`,
    `L${formatNumber(centerX - outer)} ${formatNumber(centerY)}Z`,
    `M${formatNumber(centerX)} ${formatNumber(centerY - inner)}`,
    `L${formatNumber(centerX + inner)} ${formatNumber(centerY)}`,
    `L${formatNumber(centerX)} ${formatNumber(centerY + inner)}`,
    `L${formatNumber(centerX - inner)} ${formatNumber(centerY)}Z`,
  ].join(" ");
}

function solidDiamond(centerX: number, centerY: number, radius: number): string {
  return [
    `M${formatNumber(centerX)} ${formatNumber(centerY - radius)}`,
    `L${formatNumber(centerX + radius)} ${formatNumber(centerY)}`,
    `L${formatNumber(centerX)} ${formatNumber(centerY + radius)}`,
    `L${formatNumber(centerX - radius)} ${formatNumber(centerY)}Z`,
  ].join(" ");
}

function bronzeNodeOrnaments(bbox: GlyphVariant["bbox"]): { path: string; bbox: GlyphVariant["bbox"] } {
  const [xMin, yMin, xMax, yMax] = bbox;
  const width = xMax - xMin;
  const height = yMax - yMin;
  const radius = Math.max(10, Math.min(18, width * 0.025));
  return {
    path: [
      solidDiamond(xMin + width * 0.18, yMin + height * 0.34, radius),
      solidDiamond(xMax - width * 0.14, yMin + height * 0.62, radius * 0.84),
    ].join(" "),
    bbox,
  };
}

function birdEyeOrnaments(bbox: GlyphVariant["bbox"]): { path: string; bbox: GlyphVariant["bbox"] } {
  const [xMin, yMin, xMax, yMax] = bbox;
  const width = xMax - xMin;
  const outer = Math.max(18, Math.min(32, width * 0.055));
  const inner = outer * 0.42;
  const y = Math.max(outer + 20, yMin + outer * 0.9);
  const left = xMin + width * 0.24;
  const right = xMax - width * 0.24;
  return {
    path: `${diamondRing(left, y, outer, inner)} ${diamondRing(right, y, outer, inner)}`,
    bbox: [
      Math.min(xMin, left - outer, right - outer),
      Math.min(yMin, y - outer),
      Math.max(xMax, left + outer, right + outer),
      yMax,
    ],
  };
}

function transformBbox(bbox: GlyphVariant["bbox"], profile: TransformProfile): GlyphVariant["bbox"] {
  const matrix = matrixFor(profile);
  const corners = [
    mapPoint(bbox[0], bbox[1], matrix, profile.quantize),
    mapPoint(bbox[2], bbox[1], matrix, profile.quantize),
    mapPoint(bbox[0], bbox[3], matrix, profile.quantize),
    mapPoint(bbox[2], bbox[3], matrix, profile.quantize),
  ];
  return [
    Math.min(...corners.map(([x]) => x)),
    Math.min(...corners.map(([, y]) => y)),
    Math.max(...corners.map(([x]) => x)),
    Math.max(...corners.map(([, y]) => y)),
  ];
}

function deriveVariant(base: GlyphVariant, profile: StyleProfile): GlyphVariant {
  const transformedBbox = transformBbox(base.bbox, profile);
  const transformedPath = transformGlyphPath(base.svgPath, profile);
  const ornament = profile.ornament === "bird-eyes"
    ? birdEyeOrnaments(transformedBbox)
    : profile.ornament === "bronze-nodes"
      ? bronzeNodeOrnaments(transformedBbox)
      : null;
  const svgPath = ornament ? `${transformedPath} ${ornament.path}` : transformedPath;
  const assetHash = stableHash(`${GLYPH_ASSET_VERSION}|${profile.script}|${base.assetHash}|${svgPath}`);
  return {
    ...base,
    id: `fangcun-derived-v2:${profile.script}:${base.unicode.slice(2)}:${base.sourceCharacter.codePointAt(0)?.toString(16) ?? "0"}:${assetHash}`,
    script: profile.script,
    svgPath,
    bbox: ornament?.bbox ?? transformedBbox,
    visualCenter: (() => {
      const [x, y] = mapPoint(base.visualCenter.x, base.visualCenter.y, matrixFor(profile), profile.quantize);
      return { x, y };
    })(),
    inkDensity: Math.min(0.85, Math.max(0.05, Math.round(base.inkDensity * profile.scaleX * profile.scaleY * 10_000) / 10_000)),
    complexity: base.complexity + (profile.ornament === "bird-eyes" ? 16 : profile.ornament === "bronze-nodes" ? 8 : 0),
    strokeCount: base.strokeCount + (profile.ornament === "bird-eyes" ? 4 : profile.ornament === "bronze-nodes" ? 2 : 0),
    source: `方寸${profile.labelZh}现代风格扩展（基于${base.source}）`,
    sourceId: `fangcun-derived-${profile.script}-v2`,
    era: profile.era,
    confidence: "generated",
    isModernSealized: true,
    noteZh: `由已授权来源字形「${base.sourceCharacter}」按${profile.labelZh}视觉规则确定性派生，用于补足现代输入，不等同于逐字文物摹本。`,
    assetVersion: GLYPH_ASSET_VERSION,
    assetHash,
    stretchLimits: profile.stretchLimits,
    tags: [profile.script, "modern-style-extension", `derived-from:${base.sourceId}`],
  };
}

export function deriveModernStyleVariants(catalog: readonly GlyphVariant[]): GlyphVariant[] {
  const grouped = new Map<string, GlyphVariant[]>();
  for (const variant of catalog) {
    const variants = grouped.get(variant.character) ?? [];
    variants.push(variant);
    grouped.set(variant.character, variants);
  }

  const derived: GlyphVariant[] = [];
  for (const variants of grouped.values()) {
    const bases = variants.filter((variant) => variant.script === "xiaozhuan");
    const fallbackBases = bases.length > 0 ? bases : variants.slice(0, 1);
    for (const profile of MODERN_STYLE_PROFILES) {
      if (variants.some((variant) => variant.script === profile.script)) continue;
      derived.push(...fallbackBases.map((base) => deriveVariant(base, profile)));
    }
  }
  return derived;
}
