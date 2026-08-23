import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ClassroomExerciseId } from "@fangcun/knowledge/classroom-exercises";

export const CLASSROOM_STATUSES = ["open", "closed"] as const;
export type ClassroomStatus = (typeof CLASSROOM_STATUSES)[number];

export type ClassroomCollection = {
  id: string;
  title: string;
  exerciseId: ClassroomExerciseId;
  joinCode: string;
  status: ClassroomStatus;
  createdAt: string;
  ownerId: string | null;
  isOwner: boolean;
};

export type ClassroomSubmission = {
  id: string;
  collectionId: string;
  projectId: string;
  versionId: string;
  displayName: string | null;
  dsl: SealDsl;
  engineVersion: string;
  glyphAssetVersion: string;
  createdAt: string;
  updatedAt: string;
};

type ClassroomCollectionRow = {
  id?: unknown;
  owner_id?: unknown;
  title?: unknown;
  exercise_id?: unknown;
  join_code?: unknown;
  status?: unknown;
  created_at?: unknown;
  is_owner?: unknown;
};

type ClassroomSubmissionRow = {
  id?: unknown;
  collection_id?: unknown;
  project_id?: unknown;
  version_id?: unknown;
  display_name?: unknown;
  dsl?: unknown;
  engine_version?: unknown;
  glyph_asset_version?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const EXERCISE_IDS = new Set<string>(["name-seal", "red-white", "reading-order"]);

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(prefix: string, error: { message?: string } | null): Error {
  return new Error(`${prefix}:${error?.message ?? "unknown"}`);
}

export function normalizeClassroomCode(input: string): string {
  const normalized = input.trim().replace(/[\s-]+/g, "").toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(normalized)) throw new Error("CLASSROOM_CODE_INVALID");
  return normalized;
}

export function formatClassroomCode(code: string): string {
  const normalized = normalizeClassroomCode(code);
  return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
}

export function normalizeClassroomTitle(input: string): string {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (normalized.length < 1 || normalized.length > 80) throw new Error("CLASSROOM_TITLE_INVALID");
  return normalized;
}

export function normalizeClassroomDisplayName(input: string): string | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > 40) throw new Error("CLASSROOM_DISPLAY_NAME_INVALID");
  return normalized;
}

function parseStatus(value: unknown): ClassroomStatus | null {
  return value === "open" || value === "closed" ? value : null;
}

function parseExerciseId(value: unknown): ClassroomExerciseId | null {
  return typeof value === "string" && EXERCISE_IDS.has(value) ? value as ClassroomExerciseId : null;
}

function parseCollection(row: unknown, defaults: { isOwner?: boolean; ownerId?: string | null } = {}): ClassroomCollection | null {
  if (!isRecord(row)) return null;
  const candidate = row as ClassroomCollectionRow;
  const id = stringValue(candidate.id);
  const title = stringValue(candidate.title)?.trim() ?? "";
  const exerciseId = parseExerciseId(candidate.exercise_id);
  const joinCode = stringValue(candidate.join_code);
  const status = parseStatus(candidate.status);
  const createdAt = stringValue(candidate.created_at);
  if (!id || title.length < 1 || title.length > 80 || !exerciseId || !joinCode || !status || !createdAt) return null;
  try {
    normalizeClassroomCode(joinCode);
  } catch {
    return null;
  }
  return {
    id,
    title,
    exerciseId,
    joinCode,
    status,
    createdAt,
    ownerId: defaults.ownerId ?? stringValue(candidate.owner_id),
    isOwner: defaults.isOwner ?? candidate.is_owner === true,
  };
}

function parseSubmission(row: unknown): ClassroomSubmission | null {
  if (!isRecord(row)) return null;
  const candidate = row as ClassroomSubmissionRow;
  const normalized = normalizeSealDsl(candidate.dsl);
  const id = stringValue(candidate.id);
  const collectionId = stringValue(candidate.collection_id);
  const projectId = stringValue(candidate.project_id);
  const versionId = stringValue(candidate.version_id);
  const engineVersion = stringValue(candidate.engine_version);
  const glyphAssetVersion = stringValue(candidate.glyph_asset_version);
  const createdAt = stringValue(candidate.created_at);
  const updatedAt = stringValue(candidate.updated_at);
  if (!normalized.ok || !id || !collectionId || !projectId || !versionId || !engineVersion || !glyphAssetVersion || !createdAt || !updatedAt) return null;
  return {
    id,
    collectionId,
    projectId,
    versionId,
    displayName: typeof candidate.display_name === "string" && candidate.display_name.trim()
      ? candidate.display_name.trim()
      : null,
    dsl: normalized.value,
    engineVersion,
    glyphAssetVersion,
    createdAt,
    updatedAt,
  };
}

export async function listOwnClassrooms(client: SupabaseClient, user: User): Promise<ClassroomCollection[]> {
  const response = await client
    .from("classroom_collections")
    .select("id,owner_id,title,exercise_id,join_code,status,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (response.error) throw errorMessage("CLASSROOM_LIST_FAILED", response.error);
  return (response.data ?? []).flatMap((row) => {
    const parsed = parseCollection(row, { isOwner: true, ownerId: user.id });
    return parsed ? [parsed] : [];
  });
}

export async function createClassroom(options: {
  client: SupabaseClient;
  title: string;
  exerciseId: ClassroomExerciseId;
  user: User;
}): Promise<ClassroomCollection> {
  const title = normalizeClassroomTitle(options.title);
  if (!EXERCISE_IDS.has(options.exerciseId)) throw new Error("CLASSROOM_EXERCISE_INVALID");
  const response = await options.client
    .from("classroom_collections")
    .insert({ owner_id: options.user.id, title, exercise_id: options.exerciseId })
    .select("id,owner_id,title,exercise_id,join_code,status,created_at")
    .single();
  if (response.error) throw errorMessage("CLASSROOM_CREATE_FAILED", response.error);
  const parsed = parseCollection(response.data, { isOwner: true, ownerId: options.user.id });
  if (!parsed) throw new Error("CLASSROOM_RESPONSE_INVALID");
  return parsed;
}

export async function resolveClassroomByCode(client: SupabaseClient, code: string): Promise<ClassroomCollection | null> {
  const joinCode = normalizeClassroomCode(code);
  const response = await client.rpc("resolve_classroom_collection", { join_code_input: joinCode }).maybeSingle();
  if (response.error) throw errorMessage("CLASSROOM_RESOLVE_FAILED", response.error);
  if (!response.data) return null;
  return parseCollection(response.data);
}

export async function updateClassroomStatus(options: {
  client: SupabaseClient;
  collectionId: string;
  status: ClassroomStatus;
  user: User;
}): Promise<ClassroomCollection> {
  const response = await options.client
    .from("classroom_collections")
    .update({ status: options.status })
    .eq("id", options.collectionId)
    .eq("owner_id", options.user.id)
    .select("id,owner_id,title,exercise_id,join_code,status,created_at")
    .single();
  if (response.error) throw errorMessage("CLASSROOM_STATUS_UPDATE_FAILED", response.error);
  const parsed = parseCollection(response.data, { isOwner: true, ownerId: options.user.id });
  if (!parsed) throw new Error("CLASSROOM_RESPONSE_INVALID");
  return parsed;
}

export async function listClassroomSubmissions(client: SupabaseClient, collectionId: string): Promise<ClassroomSubmission[]> {
  const response = await client
    .from("classroom_submissions")
    .select("id,collection_id,project_id,version_id,display_name,dsl,engine_version,glyph_asset_version,created_at,updated_at")
    .eq("collection_id", collectionId)
    .order("updated_at", { ascending: false });
  if (response.error) throw errorMessage("CLASSROOM_SUBMISSION_LIST_FAILED", response.error);
  return (response.data ?? []).flatMap((row) => {
    const parsed = parseSubmission(row);
    return parsed ? [parsed] : [];
  });
}

export async function submitClassroomWork(options: {
  client: SupabaseClient;
  joinCode: string;
  projectId: string;
  versionId: string;
  displayName: string;
}): Promise<ClassroomSubmission> {
  const response = await options.client.rpc("submit_classroom_work", {
    display_name_input: normalizeClassroomDisplayName(options.displayName),
    join_code_input: normalizeClassroomCode(options.joinCode),
    project_id_input: options.projectId.trim(),
    version_id_input: options.versionId.trim(),
  });
  if (response.error) throw errorMessage("CLASSROOM_SUBMIT_FAILED", response.error);
  const parsed = parseSubmission(response.data);
  if (!parsed) throw new Error("CLASSROOM_SUBMISSION_RESPONSE_INVALID");
  return parsed;
}
