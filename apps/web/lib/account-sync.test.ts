import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { describe, expect, it } from "vitest";
import { createProjectSyncPlan, mergeLearningProgress } from "./account-sync";
import { createEmptyLearningProgress, markLessonCompleted, markLessonStarted } from "./learning-progress";
import type { ProjectLibrary, SealProject } from "./project-store";
import { fingerprintValue } from "./sync-state";

function makeProject(id: string, options: { mode?: "yin" | "yang"; name?: string; updatedAt?: string } = {}): SealProject {
  const normalized = normalizeSealDsl({ text: "方寸", mode: options.mode ?? "yin" });
  if (!normalized.ok) throw new Error("fixture DSL should normalize");
  const updatedAt = options.updatedAt ?? "2026-08-12T00:00:00.000Z";
  return {
    id,
    name: options.name ?? "方寸印",
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt,
    archivedAt: null,
    currentVersionId: `${id}-version-1`,
    versions: [{
      id: `${id}-version-1`,
      number: 1,
      name: "初始版本",
      reason: "initial",
      createdAt: "2026-08-11T00:00:00.000Z",
      dsl: normalized.value,
      engineVersion: "0.1.0",
      assetVersion: "2026.08.2",
    }],
  };
}

function library(...projects: SealProject[]): ProjectLibrary {
  return { schemaVersion: 1, activeProjectId: projects[0]?.id ?? null, projects };
}

describe("account project sync planning", () => {
  it("automatically resolves one-sided changes from the last common fingerprint", () => {
    const baselineProject = makeProject("project-1");
    const locallyRenamed = { ...baselineProject, name: "本机新名称", updatedAt: "2026-08-12T01:00:00.000Z" };
    const remoteEdited = { ...baselineProject, name: "云端新名称", updatedAt: "2026-08-12T02:00:00.000Z" };
    const baseline = { "project-1": fingerprintValue(baselineProject) };

    expect(createProjectSyncPlan(library(locallyRenamed), [baselineProject], baseline).uploads).toEqual([locallyRenamed]);
    expect(createProjectSyncPlan(library(baselineProject), [remoteEdited], baseline).imports).toEqual([remoteEdited]);
  });

  it("requires an explicit choice when both sides changed the same project", () => {
    const baselineProject = makeProject("project-1");
    const local = { ...baselineProject, name: "本机版本", updatedAt: "2026-08-12T01:00:00.000Z" };
    const remote = { ...baselineProject, name: "云端版本", updatedAt: "2026-08-12T02:00:00.000Z" };
    const plan = createProjectSyncPlan(library(local), [remote], {
      "project-1": fingerprintValue(baselineProject),
    });

    expect(plan.uploads).toEqual([]);
    expect(plan.imports).toEqual([]);
    expect(plan.conflicts).toEqual([{ projectId: "project-1", local, remote }]);
  });

  it("uploads local-only projects, imports remote-only projects, and skips identical data", () => {
    const shared = makeProject("shared");
    const localOnly = makeProject("local-only");
    const remoteOnly = makeProject("remote-only");
    const plan = createProjectSyncPlan(library(shared, localOnly), [shared, remoteOnly], {});

    expect(plan.uploads.map((project) => project.id)).toEqual(["local-only"]);
    expect(plan.imports.map((project) => project.id)).toEqual(["remote-only"]);
    expect(plan.unchanged.map((project) => project.id)).toEqual(["shared"]);
    expect(plan.conflicts).toEqual([]);
  });
});

describe("learning progress sync", () => {
  it("merges lessons without downgrading completion", () => {
    const local = markLessonStarted(createEmptyLearningProgress(), "zhu-bai", "2026-08-12T01:00:00.000Z");
    const remote = markLessonCompleted(createEmptyLearningProgress(), "zhu-bai", "2026-08-12T02:00:00.000Z");
    const remoteWithAnotherLesson = markLessonStarted(remote, "zhangfa", "2026-08-12T03:00:00.000Z");
    const merged = mergeLearningProgress(local, remoteWithAnotherLesson);

    expect(merged.lessons["zhu-bai"]).toEqual({
      status: "completed",
      startedAt: "2026-08-12T01:00:00.000Z",
      completedAt: "2026-08-12T02:00:00.000Z",
    });
    expect(merged.lessons.zhangfa?.status).toBe("started");
  });
});
