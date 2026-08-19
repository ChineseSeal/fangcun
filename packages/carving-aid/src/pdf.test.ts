import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import { createCarvingProof } from "./index";
import { createCarvingProofPdf, deriveCarvingPdfPage } from "./pdf";

const sourceSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#F3EFE6"/><path d="M100 200H300V400H100Z" fill="#B3261E"/></svg>';

function extractAsciiText(content: string): string {
  return Array.from(content.matchAll(/<([0-9a-f]+)> Tj/gi), ([, hex]) => {
    if (!hex) return "";
    return Array.from({ length: hex.length / 2 }, (_, index) =>
      String.fromCharCode(Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)))
      .join("");
  }).join("");
}

describe("carving proof PDF", () => {
  it("creates a one-page 1:1 vector sheet with deterministic dimensions and labels", async () => {
    const normalized = normalizeSealDsl({
      physical: { material: "qingtian", sizeMm: 25 },
      text: "方寸",
    });
    if (!normalized.ok) throw new Error("fixture DSL invalid");
    const proof = createCarvingProof(normalized.value, sourceSvg);
    const page = deriveCarvingPdfPage(proof);
    const bytes = await createCarvingProofPdf(proof);
    const content = new TextDecoder("latin1").decode(bytes);
    const labels = extractAsciiText(content);

    expect(page.widthMm).toBe(76);
    expect(page.heightMm).toBe(59);
    expect(page.widthPt).toBeCloseTo(215.433, 3);
    expect(page.heightPt).toBeCloseTo(167.244, 3);
    expect(content.startsWith("%PDF-")).toBe(true);
    expect(content).toMatch(/\/Type \/Page\b/);
    expect(content).toContain("/MediaBox [0 0 215.433071 167.244094]");
    expect(labels).toContain("NORMAL / STAMPED");
    expect(labels).toContain("MIRRORED");
    expect(labels).toContain("10 mm SCALE / PRINT 100%");
    expect(labels).toContain("FANGCUN / CHECK SIDES");
    expect(content).toContain("-1 0 0 1 1000 0 cm");
    expect(content).toContain("100 200 m\n300 200 l\n300 400 l\n100 400 l");
    expect(content).not.toMatch(/#B3261E|#F3EFE6/i);
  });
});
