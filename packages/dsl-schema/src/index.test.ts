import { describe, expect, it } from "vitest";
import { getInscriptionFaces, migrateSealDsl, normalizeSealDsl } from "./index";

describe("normalizeSealDsl", () => {
  it("fills defaults and derives a stable seed", () => {
    const first = normalizeSealDsl({ text: "方寸" });
    const second = normalizeSealDsl({ text: "方寸" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.version).toBe("1.0");
      expect(first.value.layout.strategy).toBe("vertical_2");
      expect(first.value.impression.seed).toBe(second.value.impression.seed);
    }
  });

  it("clamps values and records warnings", () => {
    const result = normalizeSealDsl({
      text: "一二三四五六七八九",
      shape: { ratio: 9 },
      layout: { density: 0.1 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("一二三四五六七八");
      expect(result.value.shape.ratio).toBe(2.8);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it("migrates the 0.9 field names", () => {
    const result = normalizeSealDsl(
      migrateSealDsl({
        version: "0.9",
        text: "方寸",
        layout: { reading_order: "traditional" },
        impression: { randomSeed: 42 },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.impression.seed).toBe(42);
  });

  it("rejects an unsupported version", () => {
    const result = normalizeSealDsl({ version: "2.0", text: "方" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("UNSUPPORTED_VERSION");
  });

  it("migrates one legacy side inscription and normalizes unique multi-face inscriptions", () => {
    const legacy = normalizeSealDsl({
      text: "方寸",
      inscription: { enabled: true, side: "right", text: "旧款", script: "regular" },
    });
    expect(legacy.ok).toBe(true);
    if (legacy.ok) {
      expect(legacy.value.inscription.script).toBe("kai");
      expect(getInscriptionFaces(legacy.value.inscription)).toEqual([{ side: "right", text: "旧款" }]);
    }

    const multiFace = normalizeSealDsl({
      text: "方寸",
      inscription: {
        enabled: true,
        script: "lishu",
        faces: [
          { side: "front", text: "丙午" },
          { side: "back", text: "方寸刻" },
          { side: "front", text: "重复项" },
        ],
      },
    });
    expect(multiFace.ok).toBe(true);
    if (multiFace.ok) {
      expect(multiFace.value.inscription.side).toBe("front");
      expect(multiFace.value.inscription.text).toBe("丙午");
      expect(multiFace.value.inscription.faces).toEqual([
        { side: "front", text: "丙午" },
        { side: "back", text: "方寸刻" },
      ]);
    }
  });

  it("accepts the V2 physical materials and falls back safely for unknown values", () => {
    for (const material of ["copper", "jade", "wood", "ceramic"] as const) {
      const result = normalizeSealDsl({ text: "方寸", physical: { material } });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.physical.material).toBe(material);
    }

    const unknown = normalizeSealDsl({ text: "方寸", physical: { material: "ivory" } });
    expect(unknown.ok).toBe(true);
    if (unknown.ok) expect(unknown.value.physical.material).toBe("qingtian");
  });
});
