import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import type { GlyphVariant } from "@fangcun/glyph-tools";
import { renderSeal, type ExplainFacts, type RenderSealOptions } from "./index";

export type SealDslPatch = {
  mode?: SealDsl["mode"];
  style?: SealDsl["style"];
  script?: SealDsl["script"];
  shape?: Partial<SealDsl["shape"]>;
  layout?: Partial<SealDsl["layout"]>;
  border?: Partial<SealDsl["border"]>;
  impression?: Partial<SealDsl["impression"]>;
};

export type GenerateCandidate = {
  candidateId: string;
  score: number;
  dsl: SealDsl;
  dslPatch: SealDslPatch;
  previewSvg: string;
  explain: ExplainFacts;
  warnings: string[];
  missingGlyphs: string[];
};

export type GenerateCandidatesResult =
  | {
      ok: true;
      baseDsl: SealDsl;
      seed: number;
      candidates: GenerateCandidate[];
    }
  | {
      ok: false;
      errors: Array<{ code: string; path: string; message: string }>;
    };

export type RelayoutSealResult =
  | { ok: true; dsl: SealDsl; lockedGlyphs: number }
  | { ok: false; errors: Array<{ code: string; path: string; message: string }> };

function mergePatch(base: SealDsl, patch: SealDslPatch): SealDsl {
  return {
    ...base,
    ...patch,
    shape: { ...base.shape, ...patch.shape },
    layout: { ...base.layout, ...patch.layout },
    border: { ...base.border, ...patch.border },
    impression: { ...base.impression, ...patch.impression },
  };
}

function strategyOptions(count: number): string[] {
  if (count <= 1) return ["single", "single", "ring"];
  if (count === 2) return ["vertical_2", "horizontal_2", "ring"];
  if (count === 3) return ["vertical_3", "horizontal_3", "freeform"];
  return ["grid_2x2", "huiwen", "ring"];
}

function scriptOptions(base: SealDsl["script"]): SealDsl["script"][] {
  const options: SealDsl["script"][] = [base, "han_seal", "xiaozhuan", "guxi"];
  return options.filter((script, index) => options.indexOf(script) === index).slice(0, 3);
}

function styleAffinity(style: string, script: SealDsl["script"], mode: SealDsl["mode"]): number {
  const scriptScore = style.includes("guxi") && script === "guxi"
    ? 0.08
    : style.includes("qin") && script === "xiaozhuan"
      ? 0.06
      : style.includes("han") && script === "han_seal"
        ? 0.05
        : 0;
  const modeScore = style.includes("han") && mode === "yin" ? 0.04 : 0;
  return scriptScore + modeScore;
}

export function generateSealCandidates(
  input: unknown,
  catalog: readonly GlyphVariant[],
  options: RenderSealOptions = {},
): GenerateCandidatesResult {
  const normalized = normalizeSealDsl(input);
  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors.map(({ code, path, message }) => ({ code, path, message })),
    };
  }

  const base = normalized.value;
  const strategies = strategyOptions(base.glyphs.length);
  const scripts = scriptOptions(base.script);
  const patches: SealDslPatch[] = [
    {},
    {
      mode: base.mode === "yin" ? "yang" : "yin",
      layout: { strategy: strategies[1] },
      script: scripts[1],
      style: base.style === "han_private" ? "guxi_warring_states" : "han_private",
    },
    {
      shape: { type: base.shape.type === "circle" ? "square" : "circle" },
      layout: { strategy: strategies[2] },
      script: scripts[2],
      border: { type: base.shape.type === "circle" ? "single" : "irregular" },
    },
  ];

  const candidates = patches.map((patch, index) => {
    const rendered = renderSeal(mergePatch(base, patch), catalog, options);
    if (!rendered.ok) {
      throw new Error("normalized candidate unexpectedly failed: " + rendered.errors[0]?.code);
    }
    const score = Number(
      (
        0.74 +
        styleAffinity(base.style, rendered.dsl.script, rendered.dsl.mode) -
        index * 0.04 -
        rendered.missingGlyphs.length * 0.05 -
        Math.abs(rendered.dsl.layout.density - 0.76) * 0.2
      ).toFixed(2),
    );
    return {
      candidateId: "c_0" + (index + 1),
      score,
      dsl: rendered.dsl,
      dslPatch: patch,
      previewSvg: rendered.svg,
      explain: rendered.explain,
      warnings: rendered.warnings,
      missingGlyphs: rendered.missingGlyphs,
    } satisfies GenerateCandidate;
  });

  return { ok: true, baseDsl: base, seed: base.impression.seed, candidates };
}

export function relayoutSeal(input: unknown, strategy: string): RelayoutSealResult {
  const normalized = normalizeSealDsl(input);
  if (!normalized.ok) {
    return {
      ok: false,
      errors: normalized.errors.map(({ code, path, message }) => ({ code, path, message })),
    };
  }
  const base = normalized.value;
  return {
    ok: true,
    dsl: {
      ...base,
      layout: { ...base.layout, strategy },
      glyphs: base.glyphs.map((glyph) =>
        glyph.locked
          ? glyph
          : { ...glyph, dx: 0, dy: 0, rotate: 0 },
      ),
    },
    lockedGlyphs: base.glyphs.filter((glyph) => glyph.locked).length,
  };
}
