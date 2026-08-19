import { describe, expect, it } from "vitest";
import { findHistoricSeal } from "@fangcun/knowledge/historic-seals";
import { createHistoricAlbumItem, historicAlbumItemId, normalizeHistoricSealSlugs } from "./album-historic-reference";

describe("album historic references", () => {
  it("keeps only known, unique teaching-reference slugs in a local draft", () => {
    expect(normalizeHistoricSealSlugs(["ying-qu", "unknown", "ying-qu", 42, "da-fu-xi"])).toEqual(["ying-qu", "da-fu-xi"]);
    expect(normalizeHistoricSealSlugs(null)).toEqual([]);
  });

  it("creates a source-labelled reference without turning the artifact into a project", () => {
    const entry = findHistoricSeal("ying-qu");
    if (!entry) throw new Error("fixture missing");
    const item = createHistoricAlbumItem(entry, "<svg></svg>", "zh-Hans");
    expect(item).toMatchObject({
      caption: entry.shortTitle,
      dsl: entry.dsl,
      id: historicAlbumItemId(entry.slug),
      source: "历史印教学参考 · 故宫博物院",
    });
  });
});
