import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import { createAlbumPage, deriveAlbumSlots } from "./index";

function fixture(text = "方寸") {
  const result = normalizeSealDsl({ text });
  if (!result.ok) throw new Error("invalid fixture");
  return result.value;
}

const svg = '<svg viewBox="0 0 1000 1000"><title>source</title><path d="M0 0H1000V1000H0Z" fill="#B3261E"/></svg>';

describe("album layout", () => {
  it("derives deterministic 2x2 slots and preserves physical size metadata", () => {
    const items = [1, 2].map((id) => ({ id: String(id), dsl: fixture(), svg }));
    const first = deriveAlbumSlots("a4", 4, items);
    expect(first.slots).toHaveLength(4);
    expect(first.slots).toEqual(deriveAlbumSlots("a4", 4, items).slots);
    expect(first.slots[0]?.scale).toBe(1);
    expect(first.warnings).toEqual([]);
  });

  it("creates a printable page with fold guides, captions, and an explicit overflow warning", () => {
    const items = Array.from({ length: 3 }, (_, index) => ({ id: String(index), dsl: fixture(`印${index}`), svg }));
    const page = createAlbumPage(items, { layout: "jingzhe", perPage: 2, title: "我的印谱", colophon: "方寸" });
    expect(page.svg).toContain('data-fangcun-output="album-page"');
    expect(page.svg).toContain('stroke-dasharray="12 8"');
    expect(page.svg).toContain("我的印谱");
    expect(page.svg).toContain('data-album-slot="0"');
    expect(page.svg).toContain('x="1600" y="4100"');
    expect(page.svg).toContain('font-size="340"');
    expect(page.warnings).toContain("ALBUM_ITEMS_TRUNCATED_TO_PAGE");
  });
});
