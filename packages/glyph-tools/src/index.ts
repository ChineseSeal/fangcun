export type GlyphScript =
  | "xiaozhuan"
  | "han_seal"
  | "guxi"
  | "bird_worm"
  | "jinwen"
  | "jiaguwen";

export type GlyphConfidence = "attested" | "inferred" | "generated";

export { MODERN_STYLE_PROFILES } from "./derived-variants";

export type GlyphVariant = {
  id: string;
  character: string;
  unicode: string;
  script: GlyphScript;
  svgPath: string;
  viewBox: "0 0 1000 1000";
  bbox: [number, number, number, number];
  visualCenter: { x: number; y: number };
  inkDensity: number;
  complexity: number;
  strokeCount: number;
  source: string;
  sourceId: string;
  sourceUrl: string;
  sourceCharacter: string;
  license: string;
  era: string;
  confidence: GlyphConfidence;
  isModernSealized: boolean;
  noteZh: string;
  assetVersion: string;
  assetHash: string;
  stretchLimits: { x: [number, number]; y: [number, number] };
  tags: string[];
};

export type GlyphIssue = {
  code:
    | "CHARACTER_REQUIRED"
    | "UNICODE_MISMATCH"
    | "SVG_PATH_REQUIRED"
    | "VIEWBOX_INVALID"
    | "PATH_NOT_CLOSED"
    | "PATH_NOT_FINITE"
    | "BBOX_OUT_OF_RANGE"
    | "VISUAL_CENTER_OUT_OF_RANGE"
    | "INK_DENSITY_OUT_OF_RANGE"
    | "COMPLEXITY_TOO_HIGH"
    | "SOURCE_REQUIRED"
    | "SOURCE_URL_REQUIRED"
    | "ASSET_HASH_REQUIRED"
    | "STRETCH_LIMITS_INVALID"
    | "LICENSE_REQUIRED";
  message: string;
  severity: "error" | "warning";
};

export type GlyphValidationResult = {
  ok: boolean;
  issues: GlyphIssue[];
  variant: GlyphVariant;
};

export type GlyphLoadResult =
  | {
      ok: true;
      char: string;
      variant: GlyphVariant;
      fallbackLevel: "exact" | "same_script" | "related_script" | "modern_sealization";
    }
  | {
      ok: false;
      char: string;
      fallbackLevel: "none";
      reason: "MISSING_GLYPH";
    };

const numberPattern = /-?(?:\d+\.?\d*|\.\d+)/g;
const invalidNumberPattern = /(?:^|[^A-Za-z])(?:NaN|Infinity|-Infinity)(?:$|[^A-Za-z])/;

export function validateGlyphVariant(variant: GlyphVariant): GlyphValidationResult {
  const issues: GlyphIssue[] = [];
  const codePoint = variant.character.codePointAt(0)?.toString(16).toUpperCase();
  const expectedUnicode = codePoint ? "U+" + codePoint.padStart(4, "0") : "";
  const pointCount = (variant.svgPath.match(numberPattern) ?? []).length / 2;

  if (!variant.character) {
    issues.push({ code: "CHARACTER_REQUIRED", message: "character 不能为空", severity: "error" });
  }
  if (variant.unicode !== expectedUnicode) {
    issues.push({ code: "UNICODE_MISMATCH", message: "unicode 与 character 不一致", severity: "error" });
  }
  if (!variant.svgPath.trim()) {
    issues.push({ code: "SVG_PATH_REQUIRED", message: "svgPath 不能为空", severity: "error" });
  }
  if (invalidNumberPattern.test(variant.svgPath)) {
    issues.push({ code: "PATH_NOT_FINITE", message: "svgPath 不能包含非有限数值", severity: "error" });
  }
  if ((variant.svgPath.match(/M/g) ?? []).length !== (variant.svgPath.match(/Z/g) ?? []).length) {
    issues.push({ code: "PATH_NOT_CLOSED", message: "所有 SVG 子路径必须闭合", severity: "error" });
  }
  if (variant.viewBox !== "0 0 1000 1000") {
    issues.push({ code: "VIEWBOX_INVALID", message: "viewBox 必须为 0 0 1000 1000", severity: "error" });
  }
  if (
    variant.bbox.some((value) => !Number.isFinite(value)) ||
    variant.bbox[0] < -2 ||
    variant.bbox[1] < -2 ||
    variant.bbox[2] > 1002 ||
    variant.bbox[3] > 1002
  ) {
    issues.push({ code: "BBOX_OUT_OF_RANGE", message: "bbox 必须位于标准坐标系内", severity: "error" });
  }
  if (
    !Number.isFinite(variant.visualCenter.x) ||
    !Number.isFinite(variant.visualCenter.y) ||
    variant.visualCenter.x < -2 ||
    variant.visualCenter.x > 1002 ||
    variant.visualCenter.y < -2 ||
    variant.visualCenter.y > 1002
  ) {
    issues.push({ code: "VISUAL_CENTER_OUT_OF_RANGE", message: "视觉重心必须位于标准坐标系内", severity: "error" });
  }
  if (variant.inkDensity < 0.05 || variant.inkDensity > 0.85) {
    issues.push({ code: "INK_DENSITY_OUT_OF_RANGE", message: "inkDensity 必须位于 0.05–0.85", severity: "error" });
  }
  if (variant.complexity > 800 || pointCount > 800) {
    issues.push({ code: "COMPLEXITY_TOO_HIGH", message: "路径复杂度超过 800 点", severity: "warning" });
  }
  if (!variant.source || !variant.sourceId) {
    issues.push({ code: "SOURCE_REQUIRED", message: "上线 Glyph 必须有 source 与 sourceId", severity: "error" });
  }
  if (!variant.sourceUrl) {
    issues.push({ code: "SOURCE_URL_REQUIRED", message: "上线 Glyph 必须有来源链接", severity: "error" });
  }
  if (!variant.license) {
    issues.push({ code: "LICENSE_REQUIRED", message: "上线 Glyph 必须有 license", severity: "error" });
  }
  if (!/^[a-f0-9]{16,64}$/i.test(variant.assetHash) || !variant.assetVersion) {
    issues.push({ code: "ASSET_HASH_REQUIRED", message: "上线 Glyph 必须有版本与内容哈希", severity: "error" });
  }
  const limits = [...variant.stretchLimits.x, ...variant.stretchLimits.y];
  if (limits.some((value) => !Number.isFinite(value) || value <= 0) || limits[0] > limits[1] || limits[2] > limits[3]) {
    issues.push({ code: "STRETCH_LIMITS_INVALID", message: "stretchLimits 必须为有效的正数区间", severity: "error" });
  }

  return { ok: issues.every((issue) => issue.severity !== "error"), issues, variant };
}

type CatalogIndex = {
  byId: Map<string, GlyphVariant>;
  byCharacter: Map<string, GlyphVariant[]>;
  byCharacterAndScript: Map<string, GlyphVariant[]>;
};

const catalogIndexCache = new WeakMap<object, CatalogIndex>();

function catalogIndex(catalog: readonly GlyphVariant[]): CatalogIndex {
  const cached = catalogIndexCache.get(catalog);
  if (cached) return cached;
  const index: CatalogIndex = {
    byId: new Map(),
    byCharacter: new Map(),
    byCharacterAndScript: new Map(),
  };
  for (const variant of catalog) {
    index.byId.set(variant.id, variant);
    const characterVariants = index.byCharacter.get(variant.character) ?? [];
    characterVariants.push(variant);
    index.byCharacter.set(variant.character, characterVariants);
    const key = `${variant.character}:${variant.script}`;
    const scriptVariants = index.byCharacterAndScript.get(key) ?? [];
    scriptVariants.push(variant);
    index.byCharacterAndScript.set(key, scriptVariants);
  }
  catalogIndexCache.set(catalog, index);
  return index;
}

const relatedScripts: Record<GlyphScript, readonly GlyphScript[]> = {
  xiaozhuan: ["han_seal", "guxi", "jinwen", "bird_worm", "jiaguwen"],
  han_seal: ["xiaozhuan", "guxi", "jinwen", "bird_worm", "jiaguwen"],
  guxi: ["jinwen", "xiaozhuan", "han_seal", "bird_worm", "jiaguwen"],
  jinwen: ["guxi", "jiaguwen", "xiaozhuan", "han_seal", "bird_worm"],
  jiaguwen: ["jinwen", "guxi", "xiaozhuan", "han_seal", "bird_worm"],
  bird_worm: ["guxi", "han_seal", "xiaozhuan", "jinwen", "jiaguwen"],
};

export function loadGlyphs(
  text: string,
  script: GlyphScript,
  catalog: readonly GlyphVariant[],
  requestedVariantIds: readonly string[] = [],
): GlyphLoadResult[] {
  const indexByCatalog = catalogIndex(catalog);
  return Array.from(text).map((char, index) => {
    const requestedId = requestedVariantIds[index];
    const exact = requestedId ? indexByCatalog.byId.get(requestedId) : undefined;
    const sameScript = indexByCatalog.byCharacterAndScript.get(`${char}:${script}`)?.[0];
    const characterVariants = indexByCatalog.byCharacter.get(char) ?? [];
    const relatedScript = relatedScripts[script]
      .flatMap((candidateScript) => indexByCatalog.byCharacterAndScript.get(`${char}:${candidateScript}`) ?? [])
      .find((variant) => !variant.isModernSealized);
    const otherHistorical = characterVariants.find((variant) => !variant.isModernSealized);
    const modernSealized = characterVariants.find((variant) => variant.isModernSealized);

    if (exact && exact.character === char) {
      return { ok: true, char, variant: exact, fallbackLevel: "exact" as const };
    }
    if (sameScript) {
      return { ok: true, char, variant: sameScript, fallbackLevel: "same_script" as const };
    }
    if (relatedScript) {
      return { ok: true, char, variant: relatedScript, fallbackLevel: "related_script" as const };
    }
    if (otherHistorical) {
      return { ok: true, char, variant: otherHistorical, fallbackLevel: "related_script" as const };
    }
    if (modernSealized) {
      return { ok: true, char, variant: modernSealized, fallbackLevel: "modern_sealization" as const };
    }
    return { ok: false, char, fallbackLevel: "none" as const, reason: "MISSING_GLYPH" as const };
  });
}

export function listGlyphVariants(
  character: string,
  preferredScript: GlyphScript,
  catalog: readonly GlyphVariant[],
): GlyphVariant[] {
  if (Array.from(character).length !== 1) return [];
  const confidenceRank: Record<GlyphConfidence, number> = { attested: 0, inferred: 1, generated: 2 };
  const scriptRank = new Map<GlyphScript, number>([
    preferredScript,
    ...relatedScripts[preferredScript],
  ].map((script, index) => [script, index]));
  return (catalogIndex(catalog).byCharacter.get(character) ?? [])
    .slice()
    .sort((left, right) => {
      const leftRank = scriptRank.get(left.script) ?? 99;
      const rightRank = scriptRank.get(right.script) ?? 99;
      return leftRank - rightRank || confidenceRank[left.confidence] - confidenceRank[right.confidence] || left.id.localeCompare(right.id);
    });
}
