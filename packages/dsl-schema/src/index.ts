import { z } from "zod";

export const CURRENT_VERSION = "1.0" as const;

export const shapeTypes = ["square", "rect", "circle", "ellipse", "freeform"] as const;
export const modeTypes = ["yin", "yang"] as const;
export const scriptTypes = [
  "xiaozhuan",
  "han_seal",
  "guxi",
  "bird_worm",
  "jinwen",
  "jiaguwen",
] as const;
export const readingOrders = ["traditional", "huiwen", "modern"] as const;
export const borderTypes = ["none", "single", "thick", "double", "irregular", "broken"] as const;
export const gridTypes = ["none", "jie", "tian", "ri"] as const;
export const pasteColors = ["vermilion", "cinnabar_deep", "vermilion_light", "black"] as const;
export const paperColors = ["xuan", "mian", "none"] as const;
export const materials = [
  "qingtian",
  "shoushan",
  "changhua",
  "bahrain",
  "copper",
  "jade",
  "wood",
  "ceramic",
  "other",
] as const;
export const inscriptionSides = ["front", "back", "left", "right"] as const;
export const inscriptionScripts = ["kai", "xingshu", "lishu"] as const;

export type ShapeType = (typeof shapeTypes)[number];
export type SealMode = (typeof modeTypes)[number];
export type ScriptType = (typeof scriptTypes)[number];
export type ReadingOrder = (typeof readingOrders)[number];
export type InscriptionSide = (typeof inscriptionSides)[number];
export type InscriptionScript = (typeof inscriptionScripts)[number];
export type SealMaterial = (typeof materials)[number];

const inscriptionFaceSchema = z.object({
  side: z.enum(inscriptionSides),
  text: z.string().max(32),
});

export const sealDslSchema = z
  .object({
    version: z.literal(CURRENT_VERSION),
    text: z.string().min(1).max(8),
    shape: z.object({
      type: z.enum(shapeTypes),
      ratio: z.number().min(0.35).max(2.8),
    }),
    mode: z.enum(modeTypes),
    style: z.string().min(1),
    script: z.enum(scriptTypes),
    layout: z.object({
      strategy: z.string().min(1),
      density: z.number().min(0.3).max(0.95),
      readingOrder: z.enum(readingOrders),
    }),
    glyphs: z.array(
      z.object({
        char: z.string().min(1).max(2),
        variantId: z.string().min(1),
        scaleX: z.number().min(0.5).max(1.5),
        scaleY: z.number().min(0.5).max(1.5),
        dx: z.number().min(-0.15).max(0.15),
        dy: z.number().min(-0.15).max(0.15),
        rotate: z.number().min(-6).max(6),
        locked: z.boolean(),
      }),
    ),
    border: z.object({
      type: z.enum(borderTypes),
      width: z.number().min(0.015).max(0.12),
      distress: z.number().min(0).max(1),
      corner: z.number().min(0).max(0.06),
    }),
    grid: z.object({
      type: z.enum(gridTypes),
      width: z.number().min(0.008).max(0.05),
    }),
    impression: z.object({
      distress: z.number().min(0).max(1),
      inkUneven: z.number().min(0).max(1),
      bleed: z.number().min(0).max(0.06),
      seed: z.number().int().min(0).max(4_294_967_295),
    }),
    paste: z.object({
      color: z.enum(pasteColors),
      opacity: z.number().min(0.7).max(1),
    }),
    paper: z.object({
      color: z.enum(paperColors),
      texture: z.number().min(0).max(0.06),
    }),
    physical: z.object({
      sizeMm: z.number().min(8).max(120),
      material: z.enum(materials),
    }),
    inscription: z.object({
      enabled: z.boolean(),
      side: z.enum(inscriptionSides),
      text: z.string().max(32),
      script: z.enum(inscriptionScripts),
      knife: z.enum(["single", "double"]),
      faces: z.array(inscriptionFaceSchema).max(4).optional(),
    }),
    meta: z.object({
      sourceSealId: z.string().nullable(),
      remixOf: z.string().nullable(),
      exerciseId: z.string().nullable(),
    }),
  })
  .passthrough();

export type SealDsl = z.infer<typeof sealDslSchema>;

export type NormalizeIssue = {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning" | "info";
};

export type NormalizeResult =
  | { ok: true; value: SealDsl; warnings: NormalizeIssue[] }
  | { ok: false; errors: NormalizeIssue[]; warnings: NormalizeIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const booleanOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  path: string,
  warnings: NormalizeIssue[],
): number {
  const numeric = numberOr(value, fallback);
  const clamped = Math.min(max, Math.max(min, numeric));
  if (clamped !== numeric) {
    warnings.push({
      code: "VALUE_CLAMPED",
      path,
      message: path + " 已限制在合法范围内",
      severity: "warning",
    });
  }
  return clamped;
}

export function hashSeed(text: string): number {
  let hash = 2_166_136_261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function migrateSealDsl(input: unknown): unknown {
  if (!isRecord(input)) return input;
  if (input.version !== "0.9") return input;

  const migrated: Record<string, unknown> = { ...input, version: CURRENT_VERSION };
  const layout = isRecord(input.layout) ? { ...input.layout } : undefined;
  if (layout && "reading_order" in layout && !("readingOrder" in layout)) {
    layout.readingOrder = layout.reading_order;
    delete layout.reading_order;
    migrated.layout = layout;
  }

  const impression = isRecord(input.impression) ? { ...input.impression } : undefined;
  if (impression && "randomSeed" in impression && !("seed" in impression)) {
    impression.seed = impression.randomSeed;
    delete impression.randomSeed;
    migrated.impression = impression;
  }
  return migrated;
}

export function normalizeSealDsl(input: unknown): NormalizeResult {
  const warnings: NormalizeIssue[] = [];
  const errors: NormalizeIssue[] = [];
  const migrated = migrateSealDsl(input);

  if (!isRecord(migrated)) {
    return {
      ok: false,
      errors: [{ code: "DSL_NOT_OBJECT", path: "", message: "DSL 必须是对象", severity: "error" }],
      warnings,
    };
  }

  if (migrated.version !== undefined && migrated.version !== CURRENT_VERSION) {
    errors.push({
      code: "UNSUPPORTED_VERSION",
      path: "version",
      message: "只支持 Seal DSL 1.0",
      severity: "error",
    });
  }

  const rawText = typeof migrated.text === "string" ? migrated.text : "";
  const characters = Array.from(rawText);
  if (characters.length === 0) {
    errors.push({ code: "TEXT_REQUIRED", path: "text", message: "印文不能为空", severity: "error" });
  }
  const text = characters.slice(0, 8).join("");
  if (characters.length > 8) {
    warnings.push({
      code: "TEXT_TRUNCATED",
      path: "text",
      message: "印文超过 8 字，已截取前 8 字",
      severity: "warning",
    });
  }

  const rawShape = isRecord(migrated.shape) ? migrated.shape : {};
  const rawLayout = isRecord(migrated.layout) ? migrated.layout : {};
  const rawBorder = isRecord(migrated.border) ? migrated.border : {};
  const rawGrid = isRecord(migrated.grid) ? migrated.grid : {};
  const rawImpression = isRecord(migrated.impression) ? migrated.impression : {};
  const rawPaste = isRecord(migrated.paste) ? migrated.paste : {};
  const rawPaper = isRecord(migrated.paper) ? migrated.paper : {};
  const rawPhysical = isRecord(migrated.physical) ? migrated.physical : {};
  const rawInscription = isRecord(migrated.inscription) ? migrated.inscription : {};
  const rawMeta = isRecord(migrated.meta) ? migrated.meta : {};

  const shapeType = shapeTypes.includes(rawShape.type as ShapeType)
    ? (rawShape.type as ShapeType)
    : "square";
  const script = scriptTypes.includes(rawScript(migrated.script) as ScriptType)
    ? (rawScript(migrated.script) as ScriptType)
    : "han_seal";
  const mode = modeTypes.includes(migrated.mode as SealMode) ? (migrated.mode as SealMode) : "yin";
  const readingOrder = readingOrders.includes(rawLayout.readingOrder as ReadingOrder)
    ? (rawLayout.readingOrder as ReadingOrder)
    : "traditional";

  const strategy = stringOr(
    rawLayout.strategy,
    characters.length >= 4 ? "grid_2x2" : characters.length === 2 ? "vertical_2" : "single",
  );
  const seed = clampNumber(
    rawImpression.seed,
    hashSeed(text || "fangcun"),
    0,
    4_294_967_295,
    "impression.seed",
    warnings,
  );

  const glyphInputs = Array.isArray(migrated.glyphs) ? migrated.glyphs : [];
  const glyphs = characters.slice(0, 8).map((character, index) => {
    const rawGlyph = isRecord(glyphInputs[index]) ? glyphInputs[index] : {};
    return {
      char: character,
      variantId: stringOr(rawGlyph.variantId, "auto:" + character + ":" + script),
      scaleX: clampNumber(rawGlyph.scaleX, 1, 0.5, 1.5, "glyphs[" + index + "].scaleX", warnings),
      scaleY: clampNumber(rawGlyph.scaleY, 1, 0.5, 1.5, "glyphs[" + index + "].scaleY", warnings),
      dx: clampNumber(rawGlyph.dx, 0, -0.15, 0.15, "glyphs[" + index + "].dx", warnings),
      dy: clampNumber(rawGlyph.dy, 0, -0.15, 0.15, "glyphs[" + index + "].dy", warnings),
      rotate: clampNumber(rawGlyph.rotate, 0, -6, 6, "glyphs[" + index + "].rotate", warnings),
      locked: booleanOr(rawGlyph.locked, false),
    };
  });

  const legacyInscriptionSide = inscriptionSides.includes(rawInscription.side as InscriptionSide)
    ? (rawInscription.side as InscriptionSide)
    : "left";
  const legacyInscriptionText = typeof rawInscription.text === "string"
    ? Array.from(rawInscription.text).slice(0, 32).join("")
    : "";
  const seenInscriptionSides = new Set<InscriptionSide>();
  const inscriptionFaces = (Array.isArray(rawInscription.faces) ? rawInscription.faces : [])
    .flatMap((entry) => {
      if (!isRecord(entry) || !inscriptionSides.includes(entry.side as InscriptionSide)) return [];
      const side = entry.side as InscriptionSide;
      if (seenInscriptionSides.has(side)) return [];
      seenInscriptionSides.add(side);
      const faceText = typeof entry.text === "string"
        ? Array.from(entry.text).slice(0, 32).join("")
        : "";
      return [{ side, text: faceText }];
    });
  if (inscriptionFaces.length === 0 && legacyInscriptionText) {
    inscriptionFaces.push({ side: legacyInscriptionSide, text: legacyInscriptionText });
  }
  const primaryInscriptionFace = inscriptionFaces[0] ?? {
    side: legacyInscriptionSide,
    text: legacyInscriptionText,
  };

  const value: SealDsl = {
    version: CURRENT_VERSION,
    text,
    shape: {
      type: shapeType,
      ratio: clampNumber(rawShape.ratio, 1, 0.35, 2.8, "shape.ratio", warnings),
    },
    mode,
    style: stringOr(migrated.style, "han_private"),
    script,
    layout: {
      strategy,
      density: clampNumber(rawLayout.density, 0.76, 0.3, 0.95, "layout.density", warnings),
      readingOrder,
    },
    glyphs,
    border: {
      type: borderTypes.includes(rawBorder.type as (typeof borderTypes)[number])
        ? (rawBorder.type as (typeof borderTypes)[number])
        : "single",
      width: clampNumber(rawBorder.width, 0.045, 0.015, 0.12, "border.width", warnings),
      distress: clampNumber(rawBorder.distress, 0.18, 0, 1, "border.distress", warnings),
      corner: clampNumber(rawBorder.corner, 0, 0, 0.06, "border.corner", warnings),
    },
    grid: {
      type: gridTypes.includes(rawGrid.type as (typeof gridTypes)[number])
        ? (rawGrid.type as (typeof gridTypes)[number])
        : "none",
      width: clampNumber(rawGrid.width, 0.02, 0.008, 0.05, "grid.width", warnings),
    },
    impression: {
      distress: clampNumber(rawImpression.distress, 0.24, 0, 1, "impression.distress", warnings),
      inkUneven: clampNumber(rawImpression.inkUneven, 0.12, 0, 1, "impression.inkUneven", warnings),
      bleed: clampNumber(rawImpression.bleed, 0.04, 0, 0.06, "impression.bleed", warnings),
      seed,
    },
    paste: {
      color: pasteColors.includes(rawPaste.color as (typeof pasteColors)[number])
        ? (rawPaste.color as (typeof pasteColors)[number])
        : "vermilion",
      opacity: clampNumber(rawPaste.opacity, 1, 0.7, 1, "paste.opacity", warnings),
    },
    paper: {
      color: paperColors.includes(rawPaper.color as (typeof paperColors)[number])
        ? (rawPaper.color as (typeof paperColors)[number])
        : "xuan",
      texture: clampNumber(rawPaper.texture, 0.03, 0, 0.06, "paper.texture", warnings),
    },
    physical: {
      sizeMm: clampNumber(rawPhysical.sizeMm, 25, 8, 120, "physical.sizeMm", warnings),
      material: materials.includes(rawPhysical.material as (typeof materials)[number])
        ? (rawPhysical.material as (typeof materials)[number])
        : "qingtian",
    },
    inscription: {
      enabled: booleanOr(rawInscription.enabled, false),
      side: primaryInscriptionFace.side,
      text: primaryInscriptionFace.text,
      script: inscriptionScripts.includes(rawInscription.script as InscriptionScript)
        ? (rawInscription.script as InscriptionScript)
        : "kai",
      knife: rawInscription.knife === "double" ? "double" : "single",
      faces: inscriptionFaces,
    },
    meta: {
      sourceSealId: typeof rawMeta.sourceSealId === "string" ? rawMeta.sourceSealId : null,
      remixOf: typeof rawMeta.remixOf === "string" ? rawMeta.remixOf : null,
      exerciseId: typeof rawMeta.exerciseId === "string" ? rawMeta.exerciseId : null,
    },
  };

  const parsed = sealDslSchema.safeParse(value);
  if (!parsed.success) {
    errors.push(
      ...parsed.error.issues.map((issue) => ({
        code: "DSL_INVALID",
        path: issue.path.join("."),
        message: issue.message,
        severity: "error" as const,
      })),
    );
    return { ok: false, errors, warnings };
  }

  return errors.length > 0
    ? { ok: false, errors, warnings }
    : { ok: true, value: parsed.data, warnings };
}

export function getInscriptionFaces(
  inscription: SealDsl["inscription"],
): Array<{ side: InscriptionSide; text: string }> {
  if (inscription.faces?.length) return inscription.faces.map((face) => ({ ...face }));
  return inscription.text ? [{ side: inscription.side, text: inscription.text }] : [];
}

function rawScript(value: unknown): string {
  return typeof value === "string" ? value : "";
}
