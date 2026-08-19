import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import {
  createInscriptionRubbingSvg,
  createInscriptionTemplate,
  getActiveInscriptionFaces,
} from "./side-inscription";

function makeDsl() {
  const normalized = normalizeSealDsl({
    text: "方寸",
    inscription: {
      enabled: true,
      script: "lishu",
      knife: "double",
      faces: [
        { side: "back", text: "方寸刻" },
        { side: "front", text: "丙午年" },
      ],
    },
  });
  if (!normalized.ok) throw new Error("fixture DSL invalid");
  return normalized.value;
}

describe("side inscriptions", () => {
  it("builds the date, maker, and place template without exceeding the DSL limit", () => {
    expect(createInscriptionTemplate({ date: "丙午年", name: "方寸", place: "杭州" }))
      .toBe("丙午年方寸刻于杭州");
    expect(Array.from(createInscriptionTemplate({ date: "甲".repeat(20), name: "乙".repeat(20), place: "丙".repeat(20) })))
      .toHaveLength(32);
  });

  it("keeps active faces in physical viewing order", () => {
    expect(getActiveInscriptionFaces(makeDsl())).toEqual([
      { side: "front", text: "丙午年" },
      { side: "back", text: "方寸刻" },
    ]);
  });

  it("exports labeled black-ground white-script rubbing panels", () => {
    const svg = createInscriptionRubbingSvg(makeDsl());
    expect(svg).toContain('data-fangcun-output="inscription-rubbing"');
    expect(svg).toContain('data-script="lishu"');
    expect(svg).toContain('data-knife="double"');
    expect(svg).toContain('data-inscription-side="front"');
    expect(svg).toContain('data-inscription-side="back"');
    expect(svg).toContain('fill="#11100e"');
    expect(svg).toContain('fill="#fffdf7"');
    expect(svg).toContain("隶书 · 双刀阴刻");
  });
});
