import { describe, expect, it } from "vitest";
import {
  countCompletedLessons,
  createEmptyLearningProgress,
  findNextLessonSlug,
  learningProgressStorageKey,
  markLessonCompleted,
  markLessonStarted,
  readLearningProgress,
  writeLearningProgress,
} from "./learning-progress";

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(learningProgressStorageKey, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("learning progress", () => {
  it("falls back safely for missing or invalid local data", () => {
    expect(readLearningProgress(createStorage())).toEqual(createEmptyLearningProgress());
    expect(readLearningProgress(createStorage("not-json"))).toEqual(createEmptyLearningProgress());
    expect(readLearningProgress(createStorage('{"version":2}'))).toEqual(createEmptyLearningProgress());
  });

  it("starts a lesson once without downgrading existing state", () => {
    const initial = createEmptyLearningProgress();
    const started = markLessonStarted(initial, "zhu-bai", "2026-08-09T10:00:00.000Z");
    expect(started.lessons["zhu-bai"]?.status).toBe("started");
    expect(markLessonStarted(started, "zhu-bai", "later")).toBe(started);
  });

  it("completes a lesson while preserving its start time", () => {
    const started = markLessonStarted(createEmptyLearningProgress(), "zhu-bai", "start");
    const completed = markLessonCompleted(started, "zhu-bai", "finish");
    expect(completed.lessons["zhu-bai"]).toEqual({
      status: "completed",
      startedAt: "start",
      completedAt: "finish",
    });
    expect(markLessonCompleted(completed, "zhu-bai", "later")).toBe(completed);
  });

  it("persists valid entries and ignores malformed lesson records", () => {
    const storage = createStorage();
    const progress = markLessonCompleted(createEmptyLearningProgress(), "zhu-bai", "finish");
    expect(writeLearningProgress(storage, progress)).toBe(true);
    expect(readLearningProgress(storage)).toEqual(progress);

    const malformed = createStorage('{"version":1,"updatedAt":"now","lessons":{"bad":{},"zhu-bai":{"status":"started","startedAt":"then"}}}');
    expect(readLearningProgress(malformed).lessons).toEqual({
      "zhu-bai": { status: "started", startedAt: "then" },
    });
  });

  it("summarizes completion and finds the next incomplete lesson", () => {
    const completed = markLessonCompleted(createEmptyLearningProgress(), "zhu-bai", "finish");
    const slugs = ["zhu-bai", "zhangfa", "dao-yintui"];
    expect(countCompletedLessons(completed, slugs)).toBe(1);
    expect(findNextLessonSlug(completed, slugs)).toBe("zhangfa");
  });
});
