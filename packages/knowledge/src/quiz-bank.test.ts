import { describe, expect, it } from "vitest";
import { gradeQuizAnswer, quizSets, toPublicQuizSet } from "./quiz-bank";

describe("quiz bank", () => {
  it("publishes one deterministic five-question introduction set", () => {
    expect(quizSets).toHaveLength(1);
    const set = quizSets[0];
    expect(set.items).toHaveLength(5);
    expect(new Set(set.items.map((item) => item.id)).size).toBe(5);

    for (const item of set.items) {
      expect(item.options.some((option) => option.id === item.answerId)).toBe(true);
      expect(item.explanationZh.length).toBeGreaterThan(20);
      expect(item.termSlugs.length).toBeGreaterThan(0);
      expect(item.lessonSlugs.length).toBeGreaterThan(0);
    }
  });

  it("strips grading material from the public payload", () => {
    const serialized = JSON.stringify(toPublicQuizSet(quizSets[0]));
    expect(serialized).not.toContain("answerId");
    expect(serialized).not.toContain("explanationZh");
    expect(serialized).not.toContain("字为纸色、底部着印泥色");
  });

  it("grades only known options and returns immediate explanation", () => {
    const correct = gradeQuizAnswer("intro", "intro-baiwen", "baiwen");
    const incorrect = gradeQuizAnswer("intro", "intro-baiwen", "zhuwen");

    expect(correct).toMatchObject({ correct: true, correctOptionId: "baiwen" });
    expect(incorrect).toMatchObject({ correct: false, correctOptionId: "baiwen" });
    expect(incorrect?.explanationZh).toContain("白文");
    expect(gradeQuizAnswer("intro", "intro-baiwen", "unknown")).toBeUndefined();
  });
});
