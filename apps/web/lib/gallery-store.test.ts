import { describe, expect, it } from "vitest";
import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { createRemixDsl, getGalleryRemixSourceId, normalizeGalleryCollectionInput, normalizeGalleryCreatorProfileInput, normalizeGalleryPageRequest } from "./gallery-store";

function sourceDsl() {
  const normalized = normalizeSealDsl({
    border: { type: "double", width: 0.07 },
    impression: { distress: 0.38, inkUneven: 0.44, seed: 9182 },
    layout: { density: 0.64, strategy: "grid_2x2" },
    mode: "yang",
    script: "guxi",
    style: "guxi_warring_states",
    text: "清风明月",
  });
  if (!normalized.ok) throw new Error("fixture invalid");
  return normalized.value;
}

describe("gallery remix lineage", () => {
  it("copies the permitted visual parameters while regenerating glyphs for new text", () => {
    const source = sourceDsl();
    const remix = createRemixDsl(source, "方寸", "44072518-68d4-4b01-a86e-4b7b1fae0d4c");
    expect(remix.text).toBe("方寸");
    expect(remix.glyphs.map((glyph) => glyph.char)).toEqual(["方", "寸"]);
    expect(remix.glyphs.every((glyph) => glyph.variantId.startsWith("auto:"))).toBe(true);
    expect(remix.style).toBe(source.style);
    expect(remix.script).toBe(source.script);
    expect(remix.layout).toEqual(source.layout);
    expect(remix.impression).toEqual(source.impression);
    expect(getGalleryRemixSourceId(remix)).toBe("44072518-68d4-4b01-a86e-4b7b1fae0d4c");
  });

  it("does not treat historic and exercise provenance as gallery remix provenance", () => {
    const source = sourceDsl();
    expect(getGalleryRemixSourceId(source)).toBeNull();
    expect(getGalleryRemixSourceId({ ...source, meta: { ...source.meta, remixOf: "historic:ying-qu" } })).toBeNull();
  });
});

describe("gallery collections", () => {
  it("normalizes a private collection without duplicating a work snapshot", () => {
    expect(normalizeGalleryCollectionInput({ description: "  给春日留白  ", title: "  我的印蜕  ", visibility: "private" })).toEqual({
      description: "给春日留白",
      title: "我的印蜕",
      visibility: "private",
    });
  });

  it("rejects out-of-range titles and descriptions", () => {
    expect(() => normalizeGalleryCollectionInput({ title: " ", visibility: "public" })).toThrow("GALLERY_COLLECTION_TITLE_INVALID");
    expect(() => normalizeGalleryCollectionInput({ description: "印".repeat(281), title: "印谱", visibility: "public" })).toThrow("GALLERY_COLLECTION_DESCRIPTION_INVALID");
  });
});

describe("gallery pagination", () => {
  it("uses bounded offsets and explicit page sizes", () => {
    expect(normalizeGalleryPageRequest(12, 12)).toEqual({ offset: 12, pageSize: 12 });
    expect(() => normalizeGalleryPageRequest(-1, 12)).toThrow("GALLERY_PAGE_OFFSET_INVALID");
    expect(() => normalizeGalleryPageRequest(0, 49)).toThrow("GALLERY_PAGE_SIZE_INVALID");
  });
});

describe("public creator profiles", () => {
  it("keeps an explicit pen name separate from account identity data", () => {
    expect(normalizeGalleryCreatorProfileInput({ bio: "  以篆刻练习章法。  ", displayName: "  方寸闲人  " })).toEqual({
      bio: "以篆刻练习章法。",
      displayName: "方寸闲人",
    });
  });

  it("rejects empty or oversized public profile fields", () => {
    expect(() => normalizeGalleryCreatorProfileInput({ displayName: " " })).toThrow("GALLERY_CREATOR_DISPLAY_NAME_INVALID");
    expect(() => normalizeGalleryCreatorProfileInput({ bio: "印".repeat(281), displayName: "方寸" })).toThrow("GALLERY_CREATOR_BIO_INVALID");
  });
});
