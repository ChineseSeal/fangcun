import type { SupabaseClient, User } from "@supabase/supabase-js";
import { achievementDefinitions, isAchievementCode } from "@fangcun/knowledge/achievements";
import {
  mergeEarnedAchievements,
  readAchievementState,
  writeSyncedAchievementState,
  type EarnedAchievement,
} from "./achievement-store";
import {
  createEmptyLearningProgress,
  normalizeLearningProgress,
  readLearningProgress,
  writeSyncedLearningProgress,
  type LearningProgress,
  type LessonProgressEntry,
} from "./learning-progress";
import {
  normalizeSealProject,
  readProjectLibrary,
  writeSyncedProjectLibrary,
  type ProjectLibrary,
  type SealProject,
  type StorageLike,
} from "./project-store";
import {
  completeAccountSync,
  fingerprintValue,
  linkAccountSyncState,
  readAccountSyncState,
} from "./sync-state";

export type ProjectConflictChoice = "local" | "remote";

export type ProjectSyncConflict = {
  projectId: string;
  local: SealProject;
  remote: SealProject;
};

export type ProjectSyncPlan = {
  uploads: SealProject[];
  imports: SealProject[];
  unchanged: SealProject[];
  conflicts: ProjectSyncConflict[];
};

export type AccountSyncResult = {
  status: "synced" | "conflict";
  conflicts: ProjectSyncConflict[];
  uploadedCount: number;
  importedCount: number;
  projectCount: number;
  completedLessonCount: number;
  achievementCount: number;
  syncedAt: string | null;
};

type RemoteProjectRow = {
  project_id: string;
  payload: unknown;
};

type RemoteLearningRow = {
  payload: unknown;
};

type RemoteAchievementRow = {
  achievement_code: string;
  earned_at: string;
};

type SyncStorage = StorageLike;

const JWT_CLOCK_SKEW_ERROR = "JWT issued at future";

function byUpdatedAt(left: SealProject, right: SealProject): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function uniqueProjectIds(local: ProjectLibrary, remote: SealProject[]): string[] {
  return [...new Set([
    ...local.projects.map((project) => project.id),
    ...remote.map((project) => project.id),
  ])].sort();
}

export function createProjectSyncPlan(
  local: ProjectLibrary,
  remote: SealProject[],
  baselineFingerprints: Record<string, string>,
): ProjectSyncPlan {
  const localById = new Map(local.projects.map((project) => [project.id, project]));
  const remoteById = new Map(remote.map((project) => [project.id, project]));
  const plan: ProjectSyncPlan = { uploads: [], imports: [], unchanged: [], conflicts: [] };

  for (const projectId of uniqueProjectIds(local, remote)) {
    const localProject = localById.get(projectId);
    const remoteProject = remoteById.get(projectId);
    if (localProject && !remoteProject) {
      plan.uploads.push(localProject);
      continue;
    }
    if (!localProject && remoteProject) {
      plan.imports.push(remoteProject);
      continue;
    }
    if (!localProject || !remoteProject) continue;

    const localFingerprint = fingerprintValue(localProject);
    const remoteFingerprint = fingerprintValue(remoteProject);
    const baseline = baselineFingerprints[projectId];
    if (localFingerprint === remoteFingerprint) {
      plan.unchanged.push(localProject);
    } else if (baseline && baseline === remoteFingerprint) {
      plan.uploads.push(localProject);
    } else if (baseline && baseline === localFingerprint) {
      plan.imports.push(remoteProject);
    } else {
      plan.conflicts.push({ projectId, local: localProject, remote: remoteProject });
    }
  }

  return plan;
}

function earlier(left: string | undefined, right: string | undefined): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return left.localeCompare(right) <= 0 ? left : right;
}

function later(left: string | undefined, right: string | undefined): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return left.localeCompare(right) >= 0 ? left : right;
}

function mergeLessonProgress(
  local: LessonProgressEntry | undefined,
  remote: LessonProgressEntry | undefined,
): LessonProgressEntry | undefined {
  if (!local) return remote;
  if (!remote) return local;
  const completedAt = earlier(local.completedAt, remote.completedAt);
  return {
    status: local.status === "completed" || remote.status === "completed" ? "completed" : "started",
    startedAt: earlier(local.startedAt, remote.startedAt) ?? local.startedAt,
    ...(completedAt ? { completedAt } : {}),
  };
}

export function mergeLearningProgress(
  local: LearningProgress,
  remote: LearningProgress,
): LearningProgress {
  const slugs = [...new Set([...Object.keys(local.lessons), ...Object.keys(remote.lessons)])].sort();
  const lessons = Object.fromEntries(slugs.flatMap((slug) => {
    const merged = mergeLessonProgress(local.lessons[slug], remote.lessons[slug]);
    return merged ? [[slug, merged] as const] : [];
  }));
  return {
    version: 1,
    updatedAt: later(local.updatedAt, remote.updatedAt) ?? "",
    lessons,
  };
}

function normalizeRemoteProjects(rows: unknown): SealProject[] {
  if (!Array.isArray(rows)) throw new Error("云端项目响应格式无效。");
  return rows.map((row) => {
    if (typeof row !== "object" || row === null) throw new Error("云端项目响应格式无效。");
    const { project_id: projectId, payload } = row as RemoteProjectRow;
    const project = normalizeSealProject(payload);
    if (!project || project.id !== projectId) throw new Error("云端项目快照校验失败。");
    return project;
  }).sort(byUpdatedAt);
}

async function readRemoteData(client: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const [projectsResponse, learningResponse, achievementsResponse] = await Promise.all([
      client
        .from("seal_projects")
        .select("project_id,payload")
        .eq("user_id", userId),
      client
        .from("learning_progress")
        .select("payload")
        .eq("user_id", userId)
        .maybeSingle(),
      client
        .from("user_achievements")
        .select("achievement_code,earned_at")
        .eq("user_id", userId),
    ]);
    const errors = [projectsResponse.error, learningResponse.error, achievementsResponse.error]
      .filter((error) => error !== null);
    const clockSkewOnly = errors.length > 0 && errors.every((error) => error.message.includes(JWT_CLOCK_SKEW_ERROR));
    if (attempt === 0 && clockSkewOnly) {
      await new Promise((resolve) => setTimeout(resolve, 1_100));
      continue;
    }
    return { projectsResponse, learningResponse, achievementsResponse };
  }
  throw new Error("账户会话时钟校验失败。");
}

function normalizeRemoteAchievements(rows: unknown): EarnedAchievement[] {
  if (!Array.isArray(rows)) throw new Error("云端印记响应格式无效。");
  return rows.flatMap((row) => {
    if (typeof row !== "object" || row === null) throw new Error("云端印记响应格式无效。");
    const { achievement_code: code, earned_at: earnedAt } = row as RemoteAchievementRow;
    if (!isAchievementCode(code) || typeof earnedAt !== "string") throw new Error("云端印记校验失败。");
    const definition = achievementDefinitions.find((candidate) => candidate.code === code);
    if (!definition) throw new Error("云端印记定义不存在。");
    return [{ code, earnedAt, sourceEvent: definition.condition.event }];
  });
}

function mergeProjects(
  local: ProjectLibrary,
  plan: ProjectSyncPlan,
  choices: Record<string, ProjectConflictChoice>,
): { library: ProjectLibrary; uploads: SealProject[]; imports: SealProject[] } {
  const projects = new Map(local.projects.map((project) => [project.id, project]));
  const uploads = [...plan.uploads];
  const imports = [...plan.imports];
  for (const project of plan.imports) projects.set(project.id, project);
  for (const conflict of plan.conflicts) {
    if (choices[conflict.projectId] === "local") {
      uploads.push(conflict.local);
    } else {
      imports.push(conflict.remote);
      projects.set(conflict.projectId, conflict.remote);
    }
  }
  const sortedProjects = [...projects.values()].sort(byUpdatedAt);
  return {
    library: {
      ...local,
      activeProjectId: sortedProjects.some((project) => project.id === local.activeProjectId)
        ? local.activeProjectId
        : sortedProjects[0]?.id ?? null,
      projects: sortedProjects,
    },
    uploads,
    imports,
  };
}

export async function synchronizeAccountData(options: {
  client: SupabaseClient;
  storage: SyncStorage;
  user: User;
  conflictChoices?: Record<string, ProjectConflictChoice>;
  occurredAt?: string;
}): Promise<AccountSyncResult> {
  const email = options.user.email ?? null;
  linkAccountSyncState(options.storage, { id: options.user.id, email });
  const localLibrary = readProjectLibrary(options.storage);
  const localLearning = readLearningProgress(options.storage);
  const localAchievements = readAchievementState(options.storage);
  const baseline = readAccountSyncState(options.storage);
  const { projectsResponse, learningResponse, achievementsResponse } = await readRemoteData(options.client, options.user.id);

  if (projectsResponse.error) throw new Error(`项目同步失败：${projectsResponse.error.message}`);
  if (learningResponse.error) throw new Error(`学习进度同步失败：${learningResponse.error.message}`);
  if (achievementsResponse.error) throw new Error(`印记同步失败：${achievementsResponse.error.message}`);

  const remoteProjects = normalizeRemoteProjects(projectsResponse.data);
  const remoteLearning = learningResponse.data
    ? normalizeLearningProgress((learningResponse.data as RemoteLearningRow).payload)
    : createEmptyLearningProgress();
  const remoteAchievements = normalizeRemoteAchievements(achievementsResponse.data);
  const plan = createProjectSyncPlan(localLibrary, remoteProjects, baseline.projectFingerprints);
  const choices = options.conflictChoices ?? {};
  const unresolvedConflicts = plan.conflicts.filter((conflict) => !choices[conflict.projectId]);
  if (unresolvedConflicts.length > 0) {
    return {
      status: "conflict",
      conflicts: unresolvedConflicts,
      uploadedCount: 0,
      importedCount: 0,
      projectCount: localLibrary.projects.length,
      completedLessonCount: Object.values(localLearning.lessons).filter((entry) => entry.status === "completed").length,
      achievementCount: Object.keys(localAchievements.earned).length,
      syncedAt: baseline.lastSyncedAt,
    };
  }

  const merged = mergeProjects(localLibrary, plan, choices);
  const mergedLearning = mergeLearningProgress(localLearning, remoteLearning);
  const mergedAchievements = mergeEarnedAchievements(localAchievements, remoteAchievements);
  const occurredAt = options.occurredAt ?? new Date().toISOString();
  const writes: PromiseLike<unknown>[] = [];
  if (merged.uploads.length > 0) {
    writes.push(options.client.from("seal_projects").upsert(
      merged.uploads.map((project) => ({
        user_id: options.user.id,
        project_id: project.id,
        payload: project,
        updated_at: project.updatedAt,
      })),
      { onConflict: "user_id,project_id" },
    ).then(({ error }) => {
      if (error) throw new Error(`上传项目失败：${error.message}`);
    }));
  }
  writes.push(options.client.from("learning_progress").upsert({
    user_id: options.user.id,
    payload: mergedLearning,
    updated_at: occurredAt,
  }, { onConflict: "user_id" }).then(({ error }) => {
    if (error) throw new Error(`上传学习进度失败：${error.message}`);
  }));
  const achievementRows = Object.values(mergedAchievements.earned).map((achievement) => ({
    achievementCode: achievement.code,
    earnedAt: achievement.earnedAt,
  }));
  if (achievementRows.length > 0) {
    writes.push(options.client.rpc("merge_user_achievements", {
      achievement_rows: achievementRows,
    }).then(({ error }) => {
      if (error) throw new Error(`上传印记失败：${error.message}`);
    }));
  }
  await Promise.all(writes);

  const writtenLibrary = writeSyncedProjectLibrary(options.storage, merged.library);
  writeSyncedLearningProgress(options.storage, mergedLearning);
  writeSyncedAchievementState(options.storage, mergedAchievements);
  const projectFingerprints = Object.fromEntries(
    writtenLibrary.projects.map((project) => [project.id, fingerprintValue(project)]),
  );
  completeAccountSync(options.storage, {
    accountId: options.user.id,
    accountEmail: email,
    projectFingerprints,
    learningFingerprint: fingerprintValue(mergedLearning),
    achievementFingerprint: fingerprintValue(mergedAchievements.earned),
    occurredAt,
  });

  return {
    status: "synced",
    conflicts: [],
    uploadedCount: merged.uploads.length,
    importedCount: merged.imports.length,
    projectCount: writtenLibrary.projects.length,
    completedLessonCount: Object.values(mergedLearning.lessons).filter((entry) => entry.status === "completed").length,
    achievementCount: Object.keys(mergedAchievements.earned).length,
    syncedAt: occurredAt,
  };
}
