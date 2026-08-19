import { describe, expect, it } from "vitest";
import {
  createEmptyAchievementState,
  evaluateAchievementEvent,
  mergeAchievementStates,
  normalizeAchievementState,
} from "./achievement-store";

describe("achievement store", () => {
  it("awards supported events once and keeps the event idempotent", () => {
    const event = { event: "quiz_completed", eventKey: "quiz:intro:attempt-1", score: 4, setSlug: "intro", total: 5 } as const;
    const first = evaluateAchievementEvent(createEmptyAchievementState(), event, "2026-08-12T01:00:00.000Z");
    const repeat = evaluateAchievementEvent(first.state, event, "2026-08-12T02:00:00.000Z");

    expect(first.awarded.map((achievement) => achievement.code)).toEqual(["shi_zhu_bai"]);
    expect(repeat.awarded).toEqual([]);
    expect(repeat.changed).toBe(false);
    expect(repeat.state.earned.shi_zhu_bai?.earnedAt).toBe("2026-08-12T01:00:00.000Z");
  });

  it("does not award 识朱白 below the documented threshold", () => {
    const result = evaluateAchievementEvent(createEmptyAchievementState(), {
      event: "quiz_completed",
      eventKey: "quiz:intro:attempt-2",
      score: 3,
      setSlug: "intro",
      total: 5,
    }, "2026-08-12T01:00:00.000Z");

    expect(result.awarded).toEqual([]);
    expect(result.state.processedEventKeys).toEqual(["quiz:intro:attempt-2"]);
  });

  it("merges local and remote sets without downgrading or duplicating achievements", () => {
    const first = evaluateAchievementEvent(createEmptyAchievementState(), {
      event: "seal_generated",
      eventKey: "generate:first",
    }, "2026-08-12T02:00:00.000Z").state;
    const remote = normalizeAchievementState({
      version: 1,
      updatedAt: "2026-08-12T03:00:00.000Z",
      earned: {
        chu_ke: { code: "chu_ke", earnedAt: "2026-08-12T01:00:00.000Z", sourceEvent: "seal_generated" },
        shang_shi: { code: "shang_shi", earnedAt: "2026-08-12T03:00:00.000Z", sourceEvent: "carving_exported" },
      },
      processedEventKeys: ["remote:one"],
    });
    const merged = mergeAchievementStates(first, remote);

    expect(Object.keys(merged.earned).sort()).toEqual(["chu_ke", "shang_shi"]);
    expect(merged.earned.chu_ke?.earnedAt).toBe("2026-08-12T01:00:00.000Z");
    expect(merged.processedEventKeys).toEqual(["generate:first", "remote:one"]);
  });

  it("drops malformed and unknown persisted codes", () => {
    const normalized = normalizeAchievementState({
      version: 1,
      updatedAt: "invalid-but-safe",
      earned: {
        unknown: { code: "unknown", earnedAt: "today", sourceEvent: "seal_generated" },
        chu_ke: { code: "chu_ke", earnedAt: "2026-08-12T01:00:00.000Z", sourceEvent: "quiz_completed" },
      },
      processedEventKeys: ["one", "one", 2],
    });

    expect(normalized.earned).toEqual({});
    expect(normalized.processedEventKeys).toEqual(["one"]);
  });
});
