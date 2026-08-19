import { describe, expect, it } from "vitest";
import { achievementDefinitions } from "./achievements";

describe("achievement definitions", () => {
  it("publishes the eight first-release seals with unique codes", () => {
    expect(achievementDefinitions).toHaveLength(8);
    expect(new Set(achievementDefinitions.map((definition) => definition.code)).size).toBe(8);
    expect(achievementDefinitions.map((definition) => definition.nameZh)).toEqual([
      "初刻",
      "识朱白",
      "通四代",
      "入印谱",
      "上石",
      "读印人",
      "藏印",
      "边款",
    ]);
  });

  it("uses only explicit, serializable condition fields", () => {
    for (const definition of achievementDefinitions) {
      expect(definition.sealText.length).toBeGreaterThan(0);
      expect(definition.descriptionZh.length).toBeGreaterThan(0);
      expect(typeof definition.condition.event).toBe("string");
      expect(JSON.parse(JSON.stringify(definition.condition))).toEqual(definition.condition);
    }
  });
});
