import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import {
  cloudAlbumToDraft,
  createAlbumDraftPage,
  createCloudAlbumSaveInput,
  parseCloudAlbum,
  resolveAlbumProjectReferences,
  type AlbumCloudDraft,
  type AlbumDraftPage,
} from "./album-cloud-store";
import { createProject, saveProjectVersion, type StorageLike } from "./project-store";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function makeDsl(text = "方寸"): SealDsl {
  const normalized = normalizeSealDsl({ text });
  if (!normalized.ok) throw new Error("fixture DSL should normalize");
  return normalized.value;
}

function makePage(overrides: Partial<AlbumDraftPage> = {}): AlbumDraftPage {
  return { ...createAlbumDraftPage(), ...overrides };
}

function makeDraft(overrides: Partial<AlbumCloudDraft> = {}): AlbumCloudDraft {
  return {
    colophon: "方寸 · 由 Seal DSL 派生",
    layout: "grid",
    pageSize: "a4",
    pages: [makePage({ selectedProjectIds: ["project-1"] })],
    perPage: 4,
    title: "我的印谱",
    ...overrides,
  };
}

describe("cloud album references", () => {
  it("pins immutable project versions independently on every page", () => {
    const storage = new MemoryStorage();
    const created = createProject(storage, makeDsl(), { projectId: "project-1", versionId: "version-1" });
    if (!created.ok) throw new Error("fixture project should create");
    const saved = saveProjectVersion(storage, "project-1", { ...makeDsl(), mode: "yang" }, { reason: "manual", versionId: "version-2" });
    if (!saved.ok) throw new Error("fixture version should save");

    const input = createCloudAlbumSaveInput({
      draft: makeDraft({
        pages: [
          makePage({ selectedProjectIds: ["project-1"], selectedProjectVersionIds: { "project-1": "version-1" } }),
          makePage({ selectedHistoricSealSlugs: ["ying-qu"] }),
        ],
      }),
      historicCaptions: { "ying-qu": "应衢玉印" },
      projects: [saved.project],
    });

    expect(input.page_count_input).toBe(2);
    expect(input.items_input).toEqual([
      {
        caption: saved.project.name,
        historic_seal_slug: null,
        page: 1,
        project_id: "project-1",
        slot: 1,
        version_id: "version-1",
      },
      {
        caption: "应衢玉印",
        historic_seal_slug: "ying-qu",
        page: 2,
        project_id: null,
        slot: 1,
        version_id: null,
      },
    ]);
    expect(resolveAlbumProjectReferences(makePage({ selectedProjectIds: ["project-1"], selectedProjectVersionIds: { "project-1": "missing-version" } }), [saved.project])).toEqual({
      missingProjectIds: ["project-1"],
      resolved: [],
    });
  });

  it("restores ordered pages and keeps canonical historic references only", () => {
    const album = parseCloudAlbum({
      album_items: [
        { caption: "应衢", historic_seal_slug: "ying-qu", page: 2, project_id: null, slot: 1, version_id: null },
        { caption: "方寸印", historic_seal_slug: null, page: 1, project_id: "project-1", slot: 1, version_id: "version-1" },
      ],
      colophon: "题跋",
      created_at: "2026-08-14T00:00:00.000Z",
      id: "6c65760d-90e9-49df-bba1-9b801a459776",
      layout: "ceye",
      page_count: 2,
      page_size: "a5",
      per_page: 2,
      title: "云端印谱",
      updated_at: "2026-08-14T00:01:00.000Z",
    });
    if (!album) throw new Error("fixture album should parse");

    expect(cloudAlbumToDraft(album)).toMatchObject({
      layout: "ceye",
      pageSize: "a5",
      pages: [
        { selectedHistoricSealSlugs: [], selectedProjectIds: ["project-1"], selectedProjectVersionIds: { "project-1": "version-1" } },
        { selectedHistoricSealSlugs: ["ying-qu"], selectedProjectIds: [], selectedProjectVersionIds: {} },
      ],
      perPage: 2,
    });
    expect(createCloudAlbumSaveInput({
      draft: makeDraft({ pages: [makePage({ selectedHistoricSealSlugs: ["ying-qu", "unknown-reference"] })] }),
      historicCaptions: { "ying-qu": "应衢玉印" },
      projects: [],
    }).items_input).toEqual([
      {
        caption: "应衢玉印",
        historic_seal_slug: "ying-qu",
        page: 1,
        project_id: null,
        slot: 1,
        version_id: null,
      },
    ]);
  });

  it("rejects malformed remote rows rather than turning them into an editable local draft", () => {
    expect(parseCloudAlbum({
      album_items: [{ historic_seal_slug: "unverified", page: 2, project_id: null, slot: 1, version_id: null }],
      colophon: "",
      created_at: "2026-08-14T00:00:00.000Z",
      id: "6c65760d-90e9-49df-bba1-9b801a459776",
      layout: "grid",
      page_count: 1,
      page_size: "a4",
      per_page: 1,
      title: "无效印谱",
      updated_at: "2026-08-14T00:00:00.000Z",
    })).toBeNull();
  });
});
