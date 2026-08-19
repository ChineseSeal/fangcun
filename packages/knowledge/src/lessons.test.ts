import { describe, expect, it } from "vitest";
import { findLesson, lessonSeeds } from "./lessons";

describe("L0 lesson seeds", () => {
  it("ships five actionable lessons in order", () => {
    expect(lessonSeeds.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5]);
    expect(lessonSeeds.every((lesson) => lesson.oneLineAnswer.length <= 30)).toBe(true);
    expect(lessonSeeds.every((lesson) => lesson.exercise.href.startsWith("/studio?"))).toBe(true);
    expect(lessonSeeds.every((lesson) => lesson.interactive.variants.length >= 2)).toBe(true);
    expect(new Set(lessonSeeds.flatMap((lesson) => lesson.interactive.variants.map((variant) => variant.id))).size).toBe(10);
  });

  it("finds lessons by stable slug", () => {
    expect(findLesson("zhu-bai")?.title).toContain("朱文与白文");
    expect(findLesson("yinni")?.order).toBe(5);
    expect(findLesson("missing")).toBeUndefined();
  });
});
