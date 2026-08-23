import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import { deriveSeal3dModel, formatSealDimensions, seal3dMaterialCatalog } from "./index";

function makeDsl(overrides: Partial<SealDsl> = {}): SealDsl {
  const normalized = normalizeSealDsl({ text: "方寸" });
  if (!normalized.ok) throw new Error("fixture DSL invalid");
  return { ...normalized.value, ...overrides };
}

describe("deriveSeal3dModel", () => {
  it("derives a stable stone model without changing the DSL", () => {
    const dsl = makeDsl();
    const snapshot = JSON.stringify(dsl);
    const first = deriveSeal3dModel(dsl);

    expect(deriveSeal3dModel(dsl)).toEqual(first);
    expect(JSON.stringify(dsl)).toBe(snapshot);
    expect(first.profile).toBe("box");
    expect(first.impressionMode).toBe("yin");
    expect(first.glyphRelief).toEqual({
      source: "seal-engine-svg",
      mode: "recessed",
      depthScale: 0.032,
      signedDepthScale: -0.032,
      maxDepthScale: 0.04,
    });
    expect(first.material.label).toBe("青田石");
    expect(first.knobVariant).toBe(["plain", "rounded", "arched"][dsl.impression.seed % 3]);
  });

  it("uses the DSL ratio for rectangular footprints", () => {
    const dsl = makeDsl({
      shape: { type: "rect", ratio: 2 },
      physical: { sizeMm: 30, material: "shoushan" },
    });
    const model = deriveSeal3dModel(dsl);

    expect(model.dimensionsMm).toEqual({ width: 30, depth: 15, height: 72 });
    expect(formatSealDimensions(model)).toBe("30 × 15 × 72 mm");
    expect(model.material.code).toBe("shoushan");
  });

  it("derives a raised Glyph relief for Zhuwen without exceeding the preview depth budget", () => {
    const model = deriveSeal3dModel(makeDsl({ mode: "yang" }));

    expect(model.impressionMode).toBe("yang");
    expect(model.glyphRelief).toEqual({
      source: "seal-engine-svg",
      mode: "raised",
      depthScale: 0.032,
      signedDepthScale: 0.032,
      maxDepthScale: 0.04,
    });
    expect(model.glyphRelief.depthScale).toBeLessThanOrEqual(model.glyphRelief.maxDepthScale);
  });

  it("uses a cylindrical inscription surface for round seals", () => {
    const model = deriveSeal3dModel(makeDsl({
      shape: { type: "circle", ratio: 1 },
      physical: { sizeMm: 24, material: "changhua" },
      inscription: {
        enabled: true,
        side: "front",
        text: "丙午方寸",
        script: "kai",
        knife: "single",
      },
    }));

    expect(model.profile).toBe("cylinder");
    expect(model.dimensionsMm).toEqual({ width: 24, depth: 24, height: 57.6 });
    expect(model.inscription.rendering).toEqual({
      surface: "cylindrical",
      relief: "bump",
      depthScale: 0.012,
    });
    expect(model.warnings).toEqual([]);
  });

  it("derives a deeper deterministic bump for double-knife inscriptions", () => {
    const dsl = makeDsl({
      inscription: {
        enabled: true,
        side: "right",
        text: "方寸",
        script: "lishu",
        knife: "double",
      },
    });

    const first = deriveSeal3dModel(dsl);
    expect(deriveSeal3dModel(dsl).inscription.rendering).toEqual(first.inscription.rendering);
    expect(first.inscription.rendering).toEqual({
      surface: "planar",
      relief: "bump",
      depthScale: 0.026,
    });
  });

  it("exposes only static inscription facts and flags freeform approximation", () => {
    const model = deriveSeal3dModel(makeDsl({
      shape: { type: "freeform", ratio: 1.2 },
      inscription: {
        enabled: true,
        side: "left",
        text: "方寸自有天地",
        script: "kai",
        knife: "single",
        faces: [
          { side: "front", text: "丙午" },
          { side: "left", text: "方寸刻" },
        ],
      },
    }));

    expect(model.inscription).toEqual({
      enabled: true,
      side: "front",
      characterCount: 5,
      faces: [
        { side: "front", text: "丙午" },
        { side: "left", text: "方寸刻" },
      ],
      knife: "single",
      script: "kai",
      rendering: {
        surface: "planar",
        relief: "bump",
        depthScale: 0.012,
      },
    });
    expect(model).not.toHaveProperty("text");
    expect(model.warnings).toEqual(["FREEFORM_PROFILE_APPROXIMATED"]);
  });

  it("changes only PBR material facts while preserving all derived geometry", () => {
    const base = makeDsl({ physical: { sizeMm: 25, material: "qingtian" } });
    const stone = deriveSeal3dModel(base);
    const materials = (["copper", "jade", "wood", "ceramic"] as const).map((material) => (
      deriveSeal3dModel({ ...base, physical: { ...base.physical, material } })
    ));

    for (const model of materials) {
      expect(model.dimensionsMm).toEqual(stone.dimensionsMm);
      expect(model.sceneScale).toEqual(stone.sceneScale);
      expect(model.profile).toBe(stone.profile);
    }
    expect(seal3dMaterialCatalog.copper).toMatchObject({ metalness: 0.78, pattern: "patina" });
    expect(seal3dMaterialCatalog.jade).toMatchObject({ clearcoat: 0.76, pattern: "cloud" });
    expect(seal3dMaterialCatalog.wood.pattern).toBe("grain");
    expect(seal3dMaterialCatalog.ceramic.pattern).toBe("speckle");
  });

  it("fits sourced artifact dimensions without inventing physical measurements", () => {
    const dsl = makeDsl({
      physical: { sizeMm: 61, material: "copper" },
      shape: { type: "rect", ratio: 54 / 61 },
    });
    const model = deriveSeal3dModel(dsl, {
      dimensionsMm: { width: 54, depth: 61, height: 117 },
      fitToView: true,
      knobVariant: "plain",
      warnings: ["HISTORIC_MODEL_APPROXIMATED"],
    });

    expect(model.dimensionsMm).toEqual({ width: 54, depth: 61, height: 117 });
    expect(model.sceneScale).toEqual({ width: 1.3846, depth: 1.5641, height: 3 });
    expect(model.material.code).toBe("copper");
    expect(model.knobVariant).toBe("plain");
    expect(model.warnings).toEqual(["HISTORIC_MODEL_APPROXIMATED"]);
  });
});
