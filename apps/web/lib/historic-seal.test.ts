import { describe, expect, it } from "vitest";
import { historicSealEntries } from "@fangcun/knowledge/historic-seals";
import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { deriveHistoricSeal3dModel, historicSealStudioHref } from "./historic-seal";

describe("historic seal Studio handoff", () => {
  it("uses new text while retaining the sourced style profile", () => {
    for (const entry of historicSealEntries) {
      const href = historicSealStudioHref(entry);
      const url = new URL(href, "https://fangcun.local");
      expect(url.pathname).toBe("/studio");
      expect(url.searchParams.get("text")).toBe(entry.practiceText);
      expect(url.searchParams.get("text")).not.toBe(entry.inscription);
      expect(url.searchParams.get("sourceSealId")).toBe(entry.slug);
      expect(url.searchParams.get("script")).toBe(entry.dsl.script);
      expect(url.searchParams.get("layout")).toBe(entry.dsl.layout.strategy);
      expect(url.searchParams.get("density")).toBe(String(entry.dsl.layout.density));
      expect(url.searchParams.get("border")).toBe(entry.dsl.border.type);
      expect(url.searchParams.get("seed")).toBe(String(entry.dsl.impression.seed));
    }
  });

  it("derives display models from structured catalogue dimensions", () => {
    for (const entry of historicSealEntries) {
      const normalized = normalizeSealDsl(entry.dsl);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) continue;
      const model = deriveHistoricSeal3dModel(entry, normalized.value);
      expect(model.dimensionsMm).toEqual(entry.model3d.dimensionsMm);
      expect(model.material.code).toBe(entry.dsl.physical.material);
      expect(model.knobVariant).toBe(entry.model3d.knobVariant);
      expect(Math.max(...Object.values(model.sceneScale))).toBe(3);
      expect(model.warnings).toContain("HISTORIC_MODEL_APPROXIMATED");
    }
  });
});
