import { describe, expect, it } from "vitest";
import { glyphCatalog } from "@fangcun/glyph-tools/catalog";
import { generateSealCandidates } from "./generate";

describe("generateSealCandidates", () => {
  it("returns three deterministic candidates with explain facts", () => {
    const input = { text: "方寸", impression: { seed: 42 } };
    const first = generateSealCandidates(input, glyphCatalog);
    const second = generateSealCandidates(input, glyphCatalog);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.candidates).toHaveLength(3);
      expect(first.candidates.map((candidate) => candidate.candidateId)).toEqual([
        "c_01",
        "c_02",
        "c_03",
      ]);
      expect(first.candidates.map((candidate) => candidate.previewSvg)).toEqual(
        second.candidates.map((candidate) => candidate.previewSvg),
      );
      expect(first.candidates[0]?.explain.layoutStrategy).toBe("vertical_2");
      expect(first.candidates[0]?.explain.modeTermSlug).toBe("baiwen");
    }
  });

  it("keeps malformed input in the typed error path", () => {
    const result = generateSealCandidates({ text: "" }, glyphCatalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("TEXT_REQUIRED");
  });

  it("keeps an explicit layout in the primary candidate", () => {
    const result = generateSealCandidates(
      {
        text: "清风",
        script: "guxi",
        layout: { strategy: "horizontal_2", density: 0.74, readingOrder: "modern" },
        impression: { seed: 26_253 },
      },
      glyphCatalog,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidates[0]?.dsl.layout).toEqual({
        strategy: "horizontal_2",
        density: 0.74,
        readingOrder: "modern",
      });
    }
  });

  it("reproduces the same candidates byte-for-byte across 100 runs", () => {
    const input = { text: "清风明月", impression: { seed: 834_921 } };
    const baseline = generateSealCandidates(input, glyphCatalog);
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;
    const expected = baseline.candidates.map((candidate) => candidate.previewSvg).join("\n");

    for (let run = 0; run < 100; run += 1) {
      const result = generateSealCandidates(input, glyphCatalog);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidates.map((candidate) => candidate.previewSvg).join("\n")).toBe(expected);
      }
    }
  });

  it("keeps local candidate generation P95 below 1.5 seconds", () => {
    const durations = Array.from({ length: 40 }, (_, index) => {
      const startedAt = performance.now();
      const result = generateSealCandidates(
        { text: "清风明月", impression: { seed: index + 1 } },
        glyphCatalog,
      );
      expect(result.ok).toBe(true);
      return performance.now() - startedAt;
    }).sort((left, right) => left - right);
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? Number.POSITIVE_INFINITY;
    expect(p95).toBeLessThan(1_500);
  });
});
