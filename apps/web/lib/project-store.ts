import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { markAccountSyncPending, readAccountSyncState } from "./sync-state";

export const PROJECT_LIBRARY_KEY = "fangcun:projects:v1";
export const LEGACY_STUDIO_DRAFT_KEY = "fangcun:studio:draft";
export const PROJECT_SCHEMA_VERSION = 1 as const;
export const ANONYMOUS_PROJECT_LIMIT = 5;

const DRAFT_KEY_PREFIX = "fangcun:draft:v1:";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ProjectVersionReason =
  | "initial"
  | "manual"
  | "autosave"
  | "export"
  | "style_change"
  | "inscription_change"
  | "material_change"
  | "variant_change"
  | "impression_change"
  | "restore";

export const PROJECT_VERSION_REASON_LABELS: Record<ProjectVersionReason, string> = {
  initial: "初始版本",
  manual: "手动保存",
  autosave: "自动保存",
  export: "导出快照",
  style_change: "样式调整",
  inscription_change: "边款调整",
  material_change: "材质调整",
  variant_change: "字形调整",
  impression_change: "重新盖印",
  restore: "历史恢复",
};

export type SealProjectVersion = {
  id: string;
  number: number;
  name: string;
  reason: ProjectVersionReason;
  createdAt: string;
  dsl: SealDsl;
  engineVersion: string;
  assetVersion: string;
};

export type SealProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentVersionId: string;
  versions: SealProjectVersion[];
};

export type ProjectLibrary = {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  activeProjectId: string | null;
  projects: SealProject[];
};

export type ProjectDraft = {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  projectId: string | null;
  dsl: SealDsl;
  engineVersion: string;
  assetVersion: string;
  updatedAt: string;
};

type MutationSuccess = {
  ok: true;
  library: ProjectLibrary;
  project: SealProject;
  version: SealProjectVersion;
  created: boolean;
};

type MutationFailure = {
  ok: false;
  reason: "INVALID_DSL" | "PROJECT_LIMIT" | "PROJECT_NOT_FOUND" | "VERSION_NOT_FOUND";
  library: ProjectLibrary;
};

export type ProjectMutationResult = MutationSuccess | MutationFailure;

type VersionOptions = {
  reason: ProjectVersionReason;
  name?: string;
  engineVersion?: string;
  assetVersion?: string;
  now?: string;
  versionId?: string;
};

type CreateOptions = Omit<VersionOptions, "reason"> & {
  projectId?: string;
};

const reasons = new Set<ProjectVersionReason>([
  "initial",
  "manual",
  "autosave",
  "export",
  "style_change",
  "inscription_change",
  "material_change",
  "variant_change",
  "impression_change",
  "restore",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function makeId(prefix: "project" | "version"): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function normalizeDsl(input: unknown): SealDsl | null {
  const result = normalizeSealDsl(input);
  return result.ok ? result.value : null;
}

function parseVersion(input: unknown): SealProjectVersion | null {
  if (!isRecord(input)) return null;
  const dsl = normalizeDsl(input.dsl);
  const id = stringValue(input.id);
  const number = typeof input.number === "number" && Number.isInteger(input.number) && input.number > 0
    ? input.number
    : 0;
  if (!dsl || !id || number === 0) return null;
  const reason = reasons.has(input.reason as ProjectVersionReason)
    ? input.reason as ProjectVersionReason
    : "manual";
  return {
    id,
    number,
    name: stringValue(input.name, `版本 ${number}`),
    reason,
    createdAt: stringValue(input.createdAt, new Date(0).toISOString()),
    dsl,
    engineVersion: stringValue(input.engineVersion, "unknown"),
    assetVersion: stringValue(input.assetVersion, "unknown"),
  };
}

export function normalizeSealProject(input: unknown): SealProject | null {
  if (!isRecord(input) || !Array.isArray(input.versions)) return null;
  const id = stringValue(input.id);
  const versions = input.versions
    .map(parseVersion)
    .filter((version): version is SealProjectVersion => version !== null)
    .sort((left, right) => left.number - right.number);
  if (!id || versions.length === 0) return null;
  const requestedCurrentId = stringValue(input.currentVersionId);
  const currentVersionId = versions.some((version) => version.id === requestedCurrentId)
    ? requestedCurrentId
    : versions.at(-1)?.id ?? "";
  const createdAt = stringValue(input.createdAt, versions[0]?.createdAt);
  const updatedAt = stringValue(input.updatedAt, versions.at(-1)?.createdAt);
  return {
    id,
    name: stringValue(input.name, `${versions.at(-1)?.dsl.text ?? "未命名"}印`),
    createdAt,
    updatedAt,
    archivedAt: typeof input.archivedAt === "string" ? input.archivedAt : null,
    currentVersionId,
    versions,
  };
}

function writeProjectLibrary(
  storage: StorageLike,
  library: ProjectLibrary,
  options: { markSyncPending?: boolean } = {},
): void {
  storage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(library));
  if (options.markSyncPending !== false) markAccountSyncPending(storage);
}

function currentVersion(project: SealProject): SealProjectVersion {
  return project.versions.find((version) => version.id === project.currentVersionId)
    ?? project.versions.at(-1)!;
}

function replaceProject(library: ProjectLibrary, project: SealProject): ProjectLibrary {
  return {
    ...library,
    activeProjectId: project.id,
    projects: library.projects
      .map((candidate) => candidate.id === project.id ? project : candidate)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}

function sameDsl(left: SealDsl, right: SealDsl): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createEmptyProjectLibrary(): ProjectLibrary {
  return { schemaVersion: PROJECT_SCHEMA_VERSION, activeProjectId: null, projects: [] };
}

export function readProjectLibrary(storage: StorageLike): ProjectLibrary {
  const raw = storage.getItem(PROJECT_LIBRARY_KEY);
  if (!raw) return createEmptyProjectLibrary();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return createEmptyProjectLibrary();
    const projects = parsed.projects
      .map(normalizeSealProject)
      .filter((project): project is SealProject => project !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const requestedActiveId = typeof parsed.activeProjectId === "string" ? parsed.activeProjectId : null;
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      activeProjectId: projects.some((project) => project.id === requestedActiveId)
        ? requestedActiveId
        : null,
      projects,
    };
  } catch {
    return createEmptyProjectLibrary();
  }
}

export function writeSyncedProjectLibrary(storage: StorageLike, library: ProjectLibrary): ProjectLibrary {
  const projects = library.projects
    .map(normalizeSealProject)
    .filter((project): project is SealProject => project !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const next: ProjectLibrary = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    activeProjectId: projects.some((project) => project.id === library.activeProjectId)
      ? library.activeProjectId
      : projects[0]?.id ?? null,
    projects,
  };
  writeProjectLibrary(storage, next, { markSyncPending: false });
  return next;
}

export function getProjectCurrentVersion(project: SealProject): SealProjectVersion {
  return currentVersion(project);
}

export function getVisibleProjectVersions(project: SealProject): SealProjectVersion[] {
  return [...project.versions
    .filter((version, index, versions) => (
      version.reason !== "autosave" || versions[index + 1]?.reason !== "autosave"
    ))]
    .reverse();
}

export function findProject(storage: StorageLike, projectId: string): SealProject | null {
  return readProjectLibrary(storage).projects.find((project) => project.id === projectId) ?? null;
}

export function createProject(
  storage: StorageLike,
  dslInput: unknown,
  options: CreateOptions = {},
): ProjectMutationResult {
  const library = readProjectLibrary(storage);
  const dsl = normalizeDsl(dslInput);
  if (!dsl) return { ok: false, reason: "INVALID_DSL", library };
  if (!readAccountSyncState(storage).accountId && library.projects.length >= ANONYMOUS_PROJECT_LIMIT) {
    return { ok: false, reason: "PROJECT_LIMIT", library };
  }
  const now = options.now ?? new Date().toISOString();
  const version: SealProjectVersion = {
    id: options.versionId ?? makeId("version"),
    number: 1,
    name: "初始版本",
    reason: "initial",
    createdAt: now,
    dsl,
    engineVersion: options.engineVersion ?? "unknown",
    assetVersion: options.assetVersion ?? "unknown",
  };
  const project: SealProject = {
    id: options.projectId ?? makeId("project"),
    name: options.name?.trim() || `${dsl.text}印`,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    currentVersionId: version.id,
    versions: [version],
  };
  const next = {
    ...library,
    activeProjectId: project.id,
    projects: [project, ...library.projects],
  };
  writeProjectLibrary(storage, next);
  return { ok: true, library: next, project, version, created: true };
}

export function saveProjectVersion(
  storage: StorageLike,
  projectId: string,
  dslInput: unknown,
  options: VersionOptions,
): ProjectMutationResult {
  const library = readProjectLibrary(storage);
  const existing = library.projects.find((project) => project.id === projectId);
  if (!existing) return { ok: false, reason: "PROJECT_NOT_FOUND", library };
  const dsl = normalizeDsl(dslInput);
  if (!dsl) return { ok: false, reason: "INVALID_DSL", library };
  const previous = currentVersion(existing);
  if (options.reason === "autosave" && sameDsl(previous.dsl, dsl)) {
    return { ok: true, library, project: existing, version: previous, created: false };
  }
  const number = Math.max(...existing.versions.map((version) => version.number)) + 1;
  const now = options.now ?? new Date().toISOString();
  const version: SealProjectVersion = {
    id: options.versionId ?? makeId("version"),
    number,
    name: options.name?.trim() || `版本 ${number}`,
    reason: options.reason,
    createdAt: now,
    dsl,
    engineVersion: options.engineVersion ?? previous.engineVersion,
    assetVersion: options.assetVersion ?? previous.assetVersion,
  };
  const project: SealProject = {
    ...existing,
    updatedAt: now,
    archivedAt: null,
    currentVersionId: version.id,
    versions: [...existing.versions, version],
  };
  const next = replaceProject(library, project);
  writeProjectLibrary(storage, next);
  return { ok: true, library: next, project, version, created: true };
}

export function restoreProjectVersion(
  storage: StorageLike,
  projectId: string,
  versionId: string,
  options: Omit<VersionOptions, "reason"> = {},
): ProjectMutationResult {
  const library = readProjectLibrary(storage);
  const project = library.projects.find((candidate) => candidate.id === projectId);
  if (!project) return { ok: false, reason: "PROJECT_NOT_FOUND", library };
  const target = project.versions.find((version) => version.id === versionId);
  if (!target) return { ok: false, reason: "VERSION_NOT_FOUND", library };
  return saveProjectVersion(storage, projectId, target.dsl, {
    ...options,
    reason: "restore",
    name: options.name ?? `恢复自版本 ${target.number}`,
    engineVersion: options.engineVersion ?? target.engineVersion,
    assetVersion: options.assetVersion ?? target.assetVersion,
  });
}

export function duplicateProject(
  storage: StorageLike,
  projectId: string,
  options: CreateOptions = {},
): ProjectMutationResult {
  const library = readProjectLibrary(storage);
  const source = library.projects.find((project) => project.id === projectId);
  if (!source) return { ok: false, reason: "PROJECT_NOT_FOUND", library };
  const version = currentVersion(source);
  return createProject(storage, version.dsl, {
    ...options,
    name: options.name ?? `${source.name} 副本`,
    engineVersion: version.engineVersion,
    assetVersion: version.assetVersion,
  });
}

export function renameProject(
  storage: StorageLike,
  projectId: string,
  name: string,
  now = new Date().toISOString(),
): SealProject | null {
  const library = readProjectLibrary(storage);
  const existing = library.projects.find((project) => project.id === projectId);
  const nextName = name.trim();
  if (!existing || !nextName) return null;
  const project = { ...existing, name: nextName, updatedAt: now };
  writeProjectLibrary(storage, replaceProject(library, project));
  return project;
}

export function renameProjectVersion(
  storage: StorageLike,
  projectId: string,
  versionId: string,
  name: string,
  now = new Date().toISOString(),
): SealProject | null {
  const library = readProjectLibrary(storage);
  const existing = library.projects.find((project) => project.id === projectId);
  const nextName = name.trim();
  if (!existing || !nextName || !existing.versions.some((version) => version.id === versionId)) return null;
  const project = {
    ...existing,
    updatedAt: now,
    versions: existing.versions.map((version) => (
      version.id === versionId ? { ...version, name: nextName } : version
    )),
  };
  writeProjectLibrary(storage, replaceProject(library, project));
  return project;
}

export function setProjectArchived(
  storage: StorageLike,
  projectId: string,
  archived: boolean,
  now = new Date().toISOString(),
): SealProject | null {
  const library = readProjectLibrary(storage);
  const existing = library.projects.find((project) => project.id === projectId);
  if (!existing) return null;
  const project = { ...existing, archivedAt: archived ? now : null, updatedAt: now };
  writeProjectLibrary(storage, replaceProject(library, project));
  return project;
}

export function projectDraftKey(projectId: string | null): string {
  return `${DRAFT_KEY_PREFIX}${projectId ?? "anonymous"}`;
}

export function writeProjectDraft(
  storage: StorageLike,
  projectId: string | null,
  dslInput: unknown,
  options: { engineVersion?: string; assetVersion?: string; now?: string } = {},
): ProjectDraft | null {
  const dsl = normalizeDsl(dslInput);
  if (!dsl) return null;
  const draft: ProjectDraft = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectId,
    dsl,
    engineVersion: options.engineVersion ?? "unknown",
    assetVersion: options.assetVersion ?? "unknown",
    updatedAt: options.now ?? new Date().toISOString(),
  };
  storage.setItem(projectDraftKey(projectId), JSON.stringify(draft));
  return draft;
}

export function readProjectDraft(storage: StorageLike, projectId: string | null): ProjectDraft | null {
  const raw = storage.getItem(projectDraftKey(projectId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const dsl = normalizeDsl(parsed.dsl);
    if (!dsl) return null;
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      projectId,
      dsl,
      engineVersion: stringValue(parsed.engineVersion, "unknown"),
      assetVersion: stringValue(parsed.assetVersion, "unknown"),
      updatedAt: stringValue(parsed.updatedAt, new Date(0).toISOString()),
    };
  } catch {
    return null;
  }
}

export function migrateLegacyStudioDraft(storage: StorageLike): ProjectDraft | null {
  const current = readProjectDraft(storage, null);
  if (current) return current;
  const raw = storage.getItem(LEGACY_STUDIO_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const draft = writeProjectDraft(storage, null, parsed.dsl, {
      engineVersion: stringValue(parsed.engineVersion, "unknown"),
      assetVersion: stringValue(parsed.assetVersion, "unknown"),
      now: stringValue(parsed.updatedAt, new Date().toISOString()),
    });
    if (draft) storage.removeItem(LEGACY_STUDIO_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}
