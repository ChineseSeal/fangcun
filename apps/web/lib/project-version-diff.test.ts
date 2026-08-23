import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import type { SealProjectVersion } from "./project-store";
import { compareProjectVersions } from "./project-version-diff";

function makeDsl(): SealDsl {
  const normalized = normalizeSealDsl({ text: "方寸" });
  if (!normalized.ok) throw new Error("fixture DSL should normalize");
  return normalized.value;
}

function makeVersion(id: string, number: number, dsl: SealDsl): SealProjectVersion {
  return {
    id,
    number,
    name: `版本 ${number}`,
    reason: number === 1 ? "initial" : "manual",
    createdAt: `2026-08-10T10:0${number}:00.000Z`,
    dsl,
    engineVersion: "0.1.0",
    assetVersion: "2026.08.2",
  };
}

describe("project version comparison", () => {
  it("returns no rows for identical immutable snapshots", () => {
    const dsl = makeDsl();
    expect(compareProjectVersions(makeVersion("v1", 1, dsl), makeVersion("v2", 2, dsl))).toEqual([]);
  });

  it("reports stable, readable DSL and glyph differences", () => {
    const beforeDsl = makeDsl();
    const afterDsl: SealDsl = {
      ...beforeDsl,
      mode: "yang",
      physical: { ...beforeDsl.physical, sizeMm: 30 },
      glyphs: beforeDsl.glyphs.map((glyph, index) => (
        index === 0 ? { ...glyph, variantId: "variant-new", rotate: 2 } : glyph
      )),
    };

    const differences = compareProjectVersions(
      makeVersion("v1", 1, beforeDsl),
      makeVersion("v2", 2, afterDsl),
    );

    expect(differences.map((difference) => difference.path)).toEqual([
      "mode",
      "physical.sizeMm",
      "glyphs[0]",
    ]);
    expect(differences[0]).toMatchObject({ before: "白文", after: "朱文" });
    expect(differences[1]).toMatchObject({ before: "25 mm", after: "30 mm" });
    expect(differences[2]?.after).toContain("variant-new · 旋转 2°");
  });

  it("includes engine and glyph asset changes in the reproducibility audit", () => {
    const before = makeVersion("v1", 1, makeDsl());
    const after = {
      ...makeVersion("v2", 2, before.dsl),
      engineVersion: "0.2.0",
      assetVersion: "2026.09.1",
    };

    expect(compareProjectVersions(before, after).map((difference) => difference.path)).toEqual([
      "engineVersion",
      "assetVersion",
    ]);
  });

  it("groups multi-face side-inscription changes into one readable row", () => {
    const beforeDsl = makeDsl();
    const afterDsl: SealDsl = {
      ...beforeDsl,
      inscription: {
        ...beforeDsl.inscription,
        enabled: true,
        side: "front",
        text: "丙午年方寸刻",
        script: "lishu",
        faces: [
          { side: "front", text: "丙午年方寸刻" },
          { side: "back", text: "于杭州" },
        ],
      },
    };

    const differences = compareProjectVersions(
      makeVersion("v1", 1, beforeDsl),
      makeVersion("v2", 2, afterDsl),
    );

    expect(differences.map((difference) => difference.path)).toEqual([
      "inscription.enabled",
      "inscription.faces",
      "inscription.script",
    ]);
    expect(differences[1]).toMatchObject({ after: "正面：丙午年方寸刻；背面：于杭州" });
    expect(differences[2]).toMatchObject({ after: "隶书" });
  });

  it("labels V2 material changes without reporting geometry changes", () => {
    const beforeDsl = makeDsl();
    const afterDsl: SealDsl = {
      ...beforeDsl,
      physical: { ...beforeDsl.physical, material: "jade" },
    };

    expect(compareProjectVersions(
      makeVersion("v1", 1, beforeDsl),
      makeVersion("v2", 2, afterDsl),
    )).toEqual([expect.objectContaining({
      path: "physical.material",
      before: "青田石",
      after: "玉",
    })]);
  });
});
