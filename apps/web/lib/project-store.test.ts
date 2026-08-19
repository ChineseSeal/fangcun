import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_PROJECT_LIMIT,
  createProject,
  duplicateProject,
  getProjectCurrentVersion,
  getVisibleProjectVersions,
  LEGACY_STUDIO_DRAFT_KEY,
  migrateLegacyStudioDraft,
  PROJECT_LIBRARY_KEY,
  projectDraftKey,
  readProjectLibrary,
  renameProjectVersion,
  restoreProjectVersion,
  saveProjectVersion,
  type StorageLike,
} from "./project-store";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function makeDsl(text = "方寸"): SealDsl {
  const normalized = normalizeSealDsl({ text });
  if (!normalized.ok) throw new Error("fixture DSL should normalize");
  return normalized.value;
}

describe("local project store", () => {
  it("recovers from malformed storage without overwriting it during reads", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROJECT_LIBRARY_KEY, "{bad json");

    expect(readProjectLibrary(storage)).toEqual({
      schemaVersion: 1,
      activeProjectId: null,
      projects: [],
    });
    expect(storage.getItem(PROJECT_LIBRARY_KEY)).toBe("{bad json");
  });

  it("creates immutable versions and deduplicates unchanged autosaves", () => {
    const storage = new MemoryStorage();
    const created = createProject(storage, makeDsl(), {
      projectId: "project-1",
      versionId: "version-1",
      now: "2026-08-10T10:00:00.000Z",
      engineVersion: "0.1.0",
      assetVersion: "2026.08.2",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const unchanged = saveProjectVersion(storage, created.project.id, created.version.dsl, {
      reason: "autosave",
      versionId: "version-unused",
      now: "2026-08-10T10:01:00.000Z",
    });
    expect(unchanged.ok && unchanged.created).toBe(false);

    const nextDsl = { ...created.version.dsl, mode: "yang" as const };
    const saved = saveProjectVersion(storage, created.project.id, nextDsl, {
      reason: "manual",
      versionId: "version-2",
      now: "2026-08-10T10:02:00.000Z",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.project.versions).toHaveLength(2);
    expect(saved.project.versions[0]?.dsl.mode).toBe("yin");
    expect(getProjectCurrentVersion(saved.project).dsl.mode).toBe("yang");
  });

  it("restores by appending a new version and preserves the future", () => {
    const storage = new MemoryStorage();
    const created = createProject(storage, makeDsl(), {
      projectId: "project-1",
      versionId: "version-1",
      now: "2026-08-10T10:00:00.000Z",
    });
    if (!created.ok) throw new Error("project should be created");
    const saved = saveProjectVersion(storage, created.project.id, {
      ...created.version.dsl,
      mode: "yang",
    }, {
      reason: "style_change",
      versionId: "version-2",
      now: "2026-08-10T10:01:00.000Z",
    });
    if (!saved.ok) throw new Error("version should be saved");

    const restored = restoreProjectVersion(storage, created.project.id, created.version.id, {
      versionId: "version-3",
      now: "2026-08-10T10:02:00.000Z",
    });
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.project.versions.map((version) => version.id)).toEqual([
      "version-1",
      "version-2",
      "version-3",
    ]);
    expect(restored.version.reason).toBe("restore");
    expect(restored.version.dsl.mode).toBe("yin");
  });

  it("renames a version without changing its immutable DSL or current pointer", () => {
    const storage = new MemoryStorage();
    const created = createProject(storage, makeDsl(), {
      projectId: "project-1",
      versionId: "version-1",
      now: "2026-08-10T10:00:00.000Z",
    });
    if (!created.ok) throw new Error("project should be created");
    const originalDsl = created.version.dsl;

    const renamed = renameProjectVersion(storage, created.project.id, created.version.id, "初稿");

    expect(renamed?.versions[0]).toMatchObject({ name: "初稿", dsl: originalDsl });
    expect(renamed?.currentVersionId).toBe(created.version.id);
    expect(renameProjectVersion(storage, created.project.id, created.version.id, "   ")).toBeNull();
  });

  it("folds consecutive autosaves while preserving newest-first timeline order", () => {
    const storage = new MemoryStorage();
    const created = createProject(storage, makeDsl(), {
      projectId: "project-1",
      versionId: "version-1",
      now: "2026-08-10T10:00:00.000Z",
    });
    if (!created.ok) throw new Error("project should be created");
    const second = saveProjectVersion(storage, created.project.id, {
      ...created.version.dsl,
      impression: { ...created.version.dsl.impression, distress: 0.3 },
    }, {
      reason: "autosave",
      versionId: "version-2",
      now: "2026-08-10T10:01:00.000Z",
    });
    if (!second.ok) throw new Error("autosave should be created");
    const third = saveProjectVersion(storage, created.project.id, {
      ...second.version.dsl,
      impression: { ...second.version.dsl.impression, distress: 0.4 },
    }, {
      reason: "autosave",
      versionId: "version-3",
      now: "2026-08-10T10:02:00.000Z",
    });
    if (!third.ok) throw new Error("autosave should be created");

    expect(getVisibleProjectVersions(third.project).map((version) => version.id)).toEqual([
      "version-3",
      "version-1",
    ]);
  });

  it("enforces the five-project anonymous limit for create and duplicate", () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < ANONYMOUS_PROJECT_LIMIT; index += 1) {
      const created = createProject(storage, makeDsl(`印${index}`), {
        projectId: `project-${index}`,
        versionId: `version-${index}`,
        now: `2026-08-10T10:0${index}:00.000Z`,
      });
      expect(created.ok).toBe(true);
    }

    const duplicate = duplicateProject(storage, "project-0", {
      projectId: "project-copy",
      versionId: "version-copy",
    });
    expect(duplicate).toMatchObject({ ok: false, reason: "PROJECT_LIMIT" });
    expect(readProjectLibrary(storage).projects).toHaveLength(ANONYMOUS_PROJECT_LIMIT);
  });

  it("migrates a legacy 0.9 draft once and removes the old key after success", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_STUDIO_DRAFT_KEY, JSON.stringify({
      dsl: {
        version: "0.9",
        text: "方寸",
        layout: { reading_order: "traditional" },
        impression: { randomSeed: 42 },
      },
      engineVersion: "0.0.9",
      updatedAt: "2026-08-09T10:00:00.000Z",
    }));

    const migrated = migrateLegacyStudioDraft(storage);
    expect(migrated?.dsl.version).toBe("1.0");
    expect(migrated?.dsl.impression.seed).toBe(42);
    expect(storage.getItem(LEGACY_STUDIO_DRAFT_KEY)).toBeNull();
    expect(storage.getItem(projectDraftKey(null))).not.toBeNull();
  });
});
