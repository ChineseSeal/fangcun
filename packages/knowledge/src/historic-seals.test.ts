import { describe, expect, it } from "vitest";
import { findHistoricSeal, historicSealEntries } from "./historic-seals";

describe("selected historic seal content", () => {
  it("publishes three sourced entries across distinct teaching styles", () => {
    expect(historicSealEntries).toHaveLength(3);
    const entry = findHistoricSeal("ying-qu");
    expect(entry).toBeDefined();
    expect(entry?.source.url).toBe("https://www.dpm.org.cn/collection/seal/229623.html");
    expect(entry?.analysis.length).toBeGreaterThanOrEqual(3);
    expect(entry?.dsl.layout.readingOrder).toBe("traditional");
    expect(historicSealEntries.map((seal) => seal.dsl.script)).toEqual([
      "han_seal",
      "guxi",
      "bird_worm",
    ]);
    expect(new Set(historicSealEntries.map((seal) => seal.artifactNumber)).size).toBe(3);
  });

  it("keeps source, image rights, and educational boundaries explicit", () => {
    for (const entry of historicSealEntries) {
      expect(entry.reconstructionNotice).toContain("不是文物原图");
      expect(entry.source.url).toMatch(/^https:\/\/www\.dpm\.org\.cn\/collection\/seal\//);
      expect(entry.source.accessedAt).toMatch(/^2026-08-/);
      expect(entry.source.license).toContain("未转载藏品图片");
      expect(entry.source.usageLimits).toContain("申请授权");
      expect(entry.practiceText).not.toBe(entry.inscription);
      expect(entry.relatedLessonSlugs.length).toBeGreaterThanOrEqual(1);
    }
    expect(JSON.stringify(historicSealEntries)).not.toMatch(/唯一|最正宗|完美复刻/);
  });

  it("stores sourced 3D dimensions and material codes separately from display copy", () => {
    expect(historicSealEntries.map((entry) => ({
      dimensions: entry.model3d.dimensionsMm,
      material: entry.dsl.physical.material,
    }))).toEqual([
      { dimensions: { width: 14, depth: 14, height: 20 }, material: "jade" },
      { dimensions: { width: 54, depth: 61, height: 117 }, material: "copper" },
      { dimensions: { width: 23, depth: 23, height: 19 }, material: "jade" },
    ]);
    expect(historicSealEntries[1].dsl.shape).toEqual({ type: "rect", ratio: 54 / 61 });
  });
});
