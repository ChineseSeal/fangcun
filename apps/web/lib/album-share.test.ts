import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import { parseAlbumShare, parsePublicAlbumShare } from "./album-share";

function makeDsl(text = "方寸"): SealDsl {
  const normalized = normalizeSealDsl({ text });
  if (!normalized.ok) throw new Error("fixture DSL should normalize");
  return normalized.value;
}

describe("album share payloads", () => {
  it("accepts a bounded multi-page snapshot and normalizes its immutable DSL", () => {
    const share = parseAlbumShare({
      album_share_items: [
        { caption: "方寸印", dsl: makeDsl(), page: 1, slot: 1 },
        { caption: null, dsl: makeDsl("天地"), page: 2, slot: 1 },
      ],
      colophon: "方寸 · 固定分享快照",
      layout: "grid",
      page_count: 2,
      page_size: "a4",
      per_page: 4,
      title: "分享印谱",
    });
    expect(share).toMatchObject({
      pageCount: 2,
      perPage: 4,
      title: "分享印谱",
      items: [
        { caption: "方寸印", page: 1, slot: 1 },
        { caption: null, page: 2, slot: 1 },
      ],
    });
    expect(share?.items[0]?.dsl.text).toBe("方寸");
    expect(parsePublicAlbumShare({
      colophon: "方寸 · 固定分享快照",
      items: [{ caption: "方寸印", dsl: makeDsl(), page: 1, slot: 1 }],
      layout: "grid",
      pageCount: 1,
      pageSize: "a4",
      perPage: 4,
      title: "公开响应",
    })?.title).toBe("公开响应");
  });

  it("rejects malformed snapshots, duplicate slots, and out-of-page items", () => {
    const base = {
      colophon: "",
      layout: "grid",
      page_count: 1,
      page_size: "a5",
      per_page: 1,
      title: "坏数据",
    };
    expect(parseAlbumShare({
      ...base,
      album_share_items: [
        { caption: null, dsl: makeDsl(), page: 1, slot: 1 },
        { caption: null, dsl: makeDsl("天地"), page: 1, slot: 1 },
      ],
    })).toBeNull();
    expect(parseAlbumShare({
      ...base,
      album_share_items: [{ caption: null, dsl: null, page: 1, slot: 1 }],
    })).toBeNull();
    expect(parseAlbumShare({
      ...base,
      album_share_items: [{ caption: null, dsl: makeDsl(), page: 2, slot: 1 }],
    })).toBeNull();
  });
});
