import { describe, expect, it } from "vitest";
import { createAlbumBookPdf, createAlbumPdf } from "./pdf";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 21000 29700" data-fangcun-output="album-page"><rect width="21000" height="29700" fill="#FBF8F1"/><path d="M100 100H900V900H100Z" fill="#B3261E"/></svg>';

describe("album PDF", () => {
  it("keeps the legacy single-page PDF helper available", async () => {
    const pdf = await createAlbumPdf({ heightMm: 297, svg, title: "方寸印谱", widthMm: 210 });
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toContain("%PDF-");
  });

  it("writes a deterministic, ordered multi-page PDF", async () => {
    const pdf = await createAlbumBookPdf({
      pages: [
        { heightMm: 297, svg, widthMm: 210 },
        { heightMm: 210, svg: svg.replace('height="297mm"', 'height="210mm"').replace('viewBox="0 0 21000 29700"', 'viewBox="0 0 21000 21000"'), widthMm: 210 },
      ],
      title: "方寸印谱",
    });
    const source = new TextDecoder().decode(pdf);
    expect(source).toContain("%PDF-");
    expect(source).toMatch(/\/Count\s+2\b/);
    expect((source.match(/\/Type\s+\/Page\b/g) ?? [])).toHaveLength(2);
    await expect(createAlbumBookPdf({
      pages: [
        { heightMm: 297, svg, widthMm: 210 },
        { heightMm: 210, svg: svg.replace('height="297mm"', 'height="210mm"').replace('viewBox="0 0 21000 29700"', 'viewBox="0 0 21000 21000"'), widthMm: 210 },
      ],
      title: "方寸印谱",
    })).resolves.toEqual(pdf);
  });
});
