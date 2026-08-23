import type { GlyphScript, GlyphVariant } from "./index";

export const GLYPH_ASSET_VERSION = "2026.08.2";

export type GeneratedGlyphRow = readonly [
  script: "xiaozhuan" | "guxi",
  character: string,
  sourceCharacter: string,
  svgPath: string,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
  visualCenterX: number,
  visualCenterY: number,
  inkDensity: number,
  complexity: number,
  strokeCount: number,
  assetHash: string,
];

type ImportedSource = {
  script: GlyphScript;
  source: string;
  sourceId: string;
  sourceUrl: string;
  license: string;
  era: string;
  confidence: GlyphVariant["confidence"];
  isModernSealized: boolean;
  noteZh: string;
  tags: string[];
};

const importedSources: Record<"guxi" | "xiaozhuan", ImportedSource> = {
  guxi: {
    script: "guxi",
    source: "敬峰中山王篆 V3",
    sourceId: "jfzsk-v3",
    sourceUrl: "https://github.com/jeffi369/JFZSKSealScript",
    license: "SIL Open Font License 1.1 — Copyright 2025 Jingfeng Liu",
    era: "战国中山国文字风格；现代扩展字形",
    confidence: "inferred",
    isModernSealized: true,
    noteZh: "基于中山三器铭文风格扩展的现代数字字形，不等同于逐字出土摹本。",
    tags: ["guxi", "zhongshan", "warring-states-inspired", "inferred"],
  },
  xiaozhuan: {
    script: "xiaozhuan",
    source: "全字库《说文解字》数位化字形",
    sourceId: "cns-shuowen-2017",
    sourceUrl: "https://www.cns11643.gov.tw/downloadList.jsp?ID=2&ID2=20",
    license: "政府资料开放授权条款第1版 / OFL-1.1；须标注数位发展部全字库来源",
    era: "《说文》传本文字；2017 年数位化",
    confidence: "attested",
    isModernSealized: false,
    noteZh: "据全字库《说文解字》字形标准化导入；现代输入别名会明确保留实际来源字形。",
    tags: ["xiaozhuan", "shuowen", "attested", "cns11643"],
  },
};

function unicodeFor(character: string): string {
  return "U+" + (character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
}

export function importedVariants(data: readonly GeneratedGlyphRow[]): GlyphVariant[] {
  return data.map(([
    script,
    character,
    sourceCharacter,
    svgPath,
    xMin,
    yMin,
    xMax,
    yMax,
    visualCenterX,
    visualCenterY,
    inkDensity,
    complexity,
    strokeCount,
    assetHash,
  ]) => {
    const source = importedSources[script];
    return {
      id: `${source.sourceId}:${source.script}:${unicodeFor(character).slice(2)}:${unicodeFor(sourceCharacter).slice(2)}:${assetHash}`,
      character,
      unicode: unicodeFor(character),
      script: source.script,
      svgPath,
      viewBox: "0 0 1000 1000",
      bbox: [xMin, yMin, xMax, yMax],
      visualCenter: { x: visualCenterX, y: visualCenterY },
      inkDensity,
      complexity,
      strokeCount,
      source: source.source,
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl,
      sourceCharacter,
      license: source.license,
      era: source.era,
      confidence: source.confidence,
      isModernSealized: source.isModernSealized,
      noteZh: sourceCharacter === character
        ? source.noteZh
        : `${source.noteZh} 当前输入「${character}」使用来源字形「${sourceCharacter}」。`,
      assetVersion: GLYPH_ASSET_VERSION,
      assetHash,
      stretchLimits: { x: [0.78, 1.22], y: [0.78, 1.22] },
      tags: [
        ...source.tags,
        `source-char:${sourceCharacter}`,
        ...(complexity > 800 ? ["high-complexity"] : []),
      ],
    };
  });
}
