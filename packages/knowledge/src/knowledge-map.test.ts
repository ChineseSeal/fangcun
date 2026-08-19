import { describe, expect, it } from "vitest";
import { evaluateKnowledgeMap, knowledgeMapNodes, type KnowledgeMapEvidence } from "./knowledge-map";

const emptyEvidence: KnowledgeMapEvidence = {
  startedLessonSlugs: [],
  completedLessonSlugs: [],
  earnedAchievementCodes: [],
};

describe("knowledge map", () => {
  it("ships an ordered map with terms attached to every node", () => {
    expect(knowledgeMapNodes.map((node) => node.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(knowledgeMapNodes.every((node) => node.termSlugs.length >= 3)).toBe(true);
    expect(new Set(knowledgeMapNodes.map((node) => node.id)).size).toBe(knowledgeMapNodes.length);
  });

  it("treats an empty map as unexplored without inventing failures", () => {
    const entries = evaluateKnowledgeMap(knowledgeMapNodes, emptyEvidence);
    expect(entries.every((entry) => entry.status === "unexplored")).toBe(true);
    expect(entries.every((entry) => entry.satisfiedEvidenceCount === 0)).toBe(true);
  });

  it("separates started, completed, and quiz mastery evidence", () => {
    const entries = evaluateKnowledgeMap(knowledgeMapNodes, {
      startedLessonSlugs: ["dao-yintui"],
      completedLessonSlugs: ["zhu-bai", "zhangfa"],
      earnedAchievementCodes: ["shi_zhu_bai"],
    });
    expect(entries.map((entry) => entry.status)).toEqual([
      "mastered",
      "mastered",
      "learning",
      "unexplored",
      "unexplored",
      "mastered",
    ]);
    expect(entries[2]?.totalEvidenceCount).toBe(1);
    expect(entries[5]?.satisfiedEvidenceCount).toBe(1);
  });

  it("ignores unknown local values instead of changing the contract", () => {
    const entries = evaluateKnowledgeMap(knowledgeMapNodes, {
      startedLessonSlugs: ["future-lesson"],
      completedLessonSlugs: ["future-lesson"],
      earnedAchievementCodes: ["future-achievement"] as never,
    });
    expect(entries.every((entry) => entry.status === "unexplored")).toBe(true);
  });
});
