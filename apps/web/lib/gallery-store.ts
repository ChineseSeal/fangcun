import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { SealProjectVersion } from "./project-store";

export const GALLERY_POST_STATUSES = ["pending", "published", "rejected", "removed"] as const;
export const GALLERY_REPORT_REASONS = ["copyright", "impersonation", "illegal", "other"] as const;
export const GALLERY_APPEAL_STATUSES = ["pending", "accepted", "rejected"] as const;
export const GALLERY_COLLECTION_VISIBILITIES = ["private", "public"] as const;

export type GalleryPostStatus = (typeof GALLERY_POST_STATUSES)[number];
export type GalleryReportReason = (typeof GALLERY_REPORT_REASONS)[number];
export type GalleryAppealStatus = (typeof GALLERY_APPEAL_STATUSES)[number];
export type GalleryCollectionVisibility = (typeof GALLERY_COLLECTION_VISIBILITIES)[number];

export type GalleryPost = {
  id: string;
  ownerId: string;
  projectId: string;
  versionId: string;
  title: string | null;
  dsl: SealDsl;
  engineVersion: string;
  glyphAssetVersion: string;
  remixSourceId: string | null;
  status: GalleryPostStatus;
  reviewReason: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type GalleryAppeal = {
  createdAt: string;
  id: string;
  postId: string;
  reason: string;
  reviewerNote: string | null;
  status: GalleryAppealStatus;
};

export type GalleryCollection = {
  createdAt: string;
  description: string | null;
  id: string;
  ownerId: string;
  title: string;
  visibility: GalleryCollectionVisibility;
};

export type GalleryCollectionDetail = {
  collection: GalleryCollection;
  posts: GalleryPost[];
};

export type GalleryPostPage = {
  hasMore: boolean;
  posts: GalleryPost[];
};

export type GalleryCreatorProfile = {
  bio: string | null;
  displayName: string;
  ownerId: string;
  updatedAt: string;
};

export const GALLERY_POSTS_PAGE_SIZE = 12;

type GalleryPostRow = {
  id: unknown;
  owner_id: unknown;
  project_id: unknown;
  version_id: unknown;
  title: unknown;
  dsl: unknown;
  engine_version: unknown;
  glyph_asset_version: unknown;
  remix_source_id: unknown;
  status: unknown;
  review_reason: unknown;
  published_at: unknown;
  created_at: unknown;
};

type GalleryAppealRow = {
  id: unknown;
  post_id: unknown;
  reason: unknown;
  status: unknown;
  reviewer_note: unknown;
  created_at: unknown;
};

type GalleryCollectionRow = {
  created_at: unknown;
  description: unknown;
  id: unknown;
  owner_id: unknown;
  title: unknown;
  visibility: unknown;
};

type GalleryCreatorProfileRow = {
  bio: unknown;
  display_name: unknown;
  owner_id: unknown;
  updated_at: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isGalleryPostStatus(value: unknown): value is GalleryPostStatus {
  return typeof value === "string" && (GALLERY_POST_STATUSES as readonly string[]).includes(value);
}

function isGalleryAppealStatus(value: unknown): value is GalleryAppealStatus {
  return typeof value === "string" && (GALLERY_APPEAL_STATUSES as readonly string[]).includes(value);
}

function isGalleryCollectionVisibility(value: unknown): value is GalleryCollectionVisibility {
  return typeof value === "string" && (GALLERY_COLLECTION_VISIBILITIES as readonly string[]).includes(value);
}

function parseGalleryPost(row: unknown): GalleryPost | null {
  if (!isRecord(row)) return null;
  const candidate = row as GalleryPostRow;
  const normalized = normalizeSealDsl(candidate.dsl);
  const id = stringValue(candidate.id);
  const ownerId = stringValue(candidate.owner_id);
  const projectId = stringValue(candidate.project_id);
  const versionId = stringValue(candidate.version_id);
  const engineVersion = stringValue(candidate.engine_version);
  const glyphAssetVersion = stringValue(candidate.glyph_asset_version);
  const createdAt = stringValue(candidate.created_at);
  if (!normalized.ok || !id || !ownerId || !projectId || !versionId || !engineVersion || !glyphAssetVersion || !createdAt || !isGalleryPostStatus(candidate.status)) return null;
  return {
    id,
    ownerId,
    projectId,
    versionId,
    title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim() : null,
    dsl: normalized.value,
    engineVersion,
    glyphAssetVersion,
    remixSourceId: stringValue(candidate.remix_source_id),
    status: candidate.status,
    reviewReason: stringValue(candidate.review_reason),
    publishedAt: stringValue(candidate.published_at),
    createdAt,
  };
}

function requireGalleryPost(row: unknown): GalleryPost {
  const post = parseGalleryPost(row);
  if (!post) throw new Error("GALLERY_POST_INVALID");
  return post;
}

function parseGalleryAppeal(row: unknown): GalleryAppeal | null {
  if (!isRecord(row)) return null;
  const candidate = row as GalleryAppealRow;
  const id = stringValue(candidate.id);
  const postId = stringValue(candidate.post_id);
  const reason = stringValue(candidate.reason);
  const createdAt = stringValue(candidate.created_at);
  if (!id || !postId || !reason || !createdAt || !isGalleryAppealStatus(candidate.status)) return null;
  return {
    id,
    postId,
    reason,
    status: candidate.status,
    reviewerNote: stringValue(candidate.reviewer_note),
    createdAt,
  };
}

function parseGalleryCollection(row: unknown): GalleryCollection | null {
  if (!isRecord(row)) return null;
  const candidate = row as GalleryCollectionRow;
  const id = stringValue(candidate.id);
  const ownerId = stringValue(candidate.owner_id);
  const title = stringValue(candidate.title);
  const createdAt = stringValue(candidate.created_at);
  if (!id || !ownerId || !title || !createdAt || !isGalleryCollectionVisibility(candidate.visibility)) return null;
  return {
    id,
    ownerId,
    title,
    description: stringValue(candidate.description),
    visibility: candidate.visibility,
    createdAt,
  };
}

function parseGalleryCreatorProfile(row: unknown): GalleryCreatorProfile | null {
  if (!isRecord(row)) return null;
  const candidate = row as GalleryCreatorProfileRow;
  const ownerId = stringValue(candidate.owner_id);
  const displayName = typeof candidate.display_name === "string" ? candidate.display_name.trim() : "";
  const updatedAt = stringValue(candidate.updated_at);
  if (!ownerId || !updatedAt || displayName.length < 1 || displayName.length > 40) return null;
  const bio = typeof candidate.bio === "string" && candidate.bio.trim() ? candidate.bio.trim() : null;
  if (bio && bio.length > 280) return null;
  return { bio, displayName, ownerId, updatedAt };
}

export function getGalleryRemixSourceId(dsl: SealDsl): string | null {
  const source = dsl.meta.remixOf;
  return source?.startsWith("gallery:") ? source.slice("gallery:".length) || null : null;
}

export function createRemixDsl(source: SealDsl, text: string, sourcePostId: string): SealDsl {
  const normalized = normalizeSealDsl({
    text,
    shape: source.shape,
    mode: source.mode,
    style: source.style,
    script: source.script,
    layout: source.layout,
    border: source.border,
    grid: source.grid,
    impression: source.impression,
    paste: source.paste,
    paper: source.paper,
    physical: source.physical,
    meta: { exerciseId: null, remixOf: `gallery:${sourcePostId}`, sourceSealId: null },
  });
  if (!normalized.ok) throw new Error("GALLERY_REMIX_INVALID");
  return normalized.value;
}

export function normalizeGalleryPageRequest(offset: number, pageSize: number): { offset: number; pageSize: number } {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("GALLERY_PAGE_OFFSET_INVALID");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) throw new Error("GALLERY_PAGE_SIZE_INVALID");
  return { offset, pageSize };
}

export async function listPublishedGalleryPostsPage(options: {
  client: SupabaseClient;
  ownerId?: string;
  offset?: number;
  pageSize?: number;
}): Promise<GalleryPostPage> {
  const { offset, pageSize } = normalizeGalleryPageRequest(options.offset ?? 0, options.pageSize ?? GALLERY_POSTS_PAGE_SIZE);
  let query = options.client
    .from("gallery_posts")
    .select("id,owner_id,project_id,version_id,title,dsl,engine_version,glyph_asset_version,remix_source_id,status,review_reason,published_at,created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize);
  if (options.ownerId) query = query.eq("owner_id", options.ownerId);
  const response = await query;
  if (response.error) throw new Error(`GALLERY_LIST_FAILED:${response.error.message}`);
  const rows = response.data ?? [];
  const posts = rows.flatMap((row) => {
    const post = parseGalleryPost(row);
    return post ? [post] : [];
  });
  return {
    hasMore: rows.length > pageSize,
    posts: posts.slice(0, pageSize),
  };
}

export async function listPublishedGalleryPosts(client: SupabaseClient, limit = 24): Promise<GalleryPost[]> {
  const page = await listPublishedGalleryPostsPage({ client, pageSize: limit });
  return page.posts;
}

export function normalizeGalleryCreatorProfileInput(input: { bio?: string; displayName: string }): { bio: string | null; displayName: string } {
  const displayName = input.displayName.trim();
  const bio = input.bio?.trim() || null;
  if (displayName.length < 1 || displayName.length > 40) throw new Error("GALLERY_CREATOR_DISPLAY_NAME_INVALID");
  if (bio && bio.length > 280) throw new Error("GALLERY_CREATOR_BIO_INVALID");
  return { bio, displayName };
}

export async function getGalleryCreatorProfile(client: SupabaseClient, ownerId: string): Promise<GalleryCreatorProfile | null> {
  const response = await client
    .from("gallery_creator_profiles")
    .select("owner_id,display_name,bio,updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (response.error) throw new Error(`GALLERY_CREATOR_PROFILE_READ_FAILED:${response.error.message}`);
  return response.data ? parseGalleryCreatorProfile(response.data) : null;
}

export async function listGalleryCreatorProfiles(client: SupabaseClient, ownerIds: readonly string[]): Promise<GalleryCreatorProfile[]> {
  const uniqueOwnerIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueOwnerIds.length === 0) return [];
  const response = await client
    .from("gallery_creator_profiles")
    .select("owner_id,display_name,bio,updated_at")
    .in("owner_id", uniqueOwnerIds);
  if (response.error) throw new Error(`GALLERY_CREATOR_PROFILE_LIST_FAILED:${response.error.message}`);
  return (response.data ?? []).flatMap((row) => {
    const profile = parseGalleryCreatorProfile(row);
    return profile ? [profile] : [];
  });
}

export async function upsertGalleryCreatorProfile(options: {
  bio?: string;
  client: SupabaseClient;
  displayName: string;
  user: User;
}): Promise<GalleryCreatorProfile> {
  const input = normalizeGalleryCreatorProfileInput(options);
  const response = await options.client
    .from("gallery_creator_profiles")
    .upsert({ bio: input.bio, display_name: input.displayName, owner_id: options.user.id, updated_at: new Date().toISOString() }, { onConflict: "owner_id" })
    .select("owner_id,display_name,bio,updated_at")
    .single();
  if (response.error) throw new Error(`GALLERY_CREATOR_PROFILE_SAVE_FAILED:${response.error.message}`);
  const profile = parseGalleryCreatorProfile(response.data);
  if (!profile) throw new Error("GALLERY_CREATOR_PROFILE_INVALID");
  return profile;
}

export async function deleteGalleryCreatorProfile(options: { client: SupabaseClient; user: User }): Promise<void> {
  const response = await options.client.from("gallery_creator_profiles").delete().eq("owner_id", options.user.id);
  if (response.error) throw new Error(`GALLERY_CREATOR_PROFILE_DELETE_FAILED:${response.error.message}`);
}

export async function listOwnGalleryPosts(client: SupabaseClient, user: User): Promise<GalleryPost[]> {
  const response = await client
    .from("gallery_posts")
    .select("id,owner_id,project_id,version_id,title,dsl,engine_version,glyph_asset_version,remix_source_id,status,review_reason,published_at,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (response.error) throw new Error(`GALLERY_OWN_LIST_FAILED:${response.error.message}`);
  return (response.data ?? []).flatMap((row) => {
    const post = parseGalleryPost(row);
    return post ? [post] : [];
  });
}

export async function listOwnGalleryAppeals(client: SupabaseClient, user: User): Promise<GalleryAppeal[]> {
  const response = await client
    .from("gallery_appeals")
    .select("id,post_id,reason,status,reviewer_note,created_at")
    .eq("appellant_id", user.id)
    .order("created_at", { ascending: false });
  if (response.error) throw new Error(`GALLERY_APPEAL_LIST_FAILED:${response.error.message}`);
  return (response.data ?? []).flatMap((row) => {
    const appeal = parseGalleryAppeal(row);
    return appeal ? [appeal] : [];
  });
}

export function normalizeGalleryCollectionInput(input: { description?: string; title: string; visibility: GalleryCollectionVisibility }): { description: string | null; title: string; visibility: GalleryCollectionVisibility } {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  if (title.length < 1 || title.length > 80) throw new Error("GALLERY_COLLECTION_TITLE_INVALID");
  if (description && description.length > 280) throw new Error("GALLERY_COLLECTION_DESCRIPTION_INVALID");
  if (!isGalleryCollectionVisibility(input.visibility)) throw new Error("GALLERY_COLLECTION_VISIBILITY_INVALID");
  return { description, title, visibility: input.visibility };
}

export async function listOwnGalleryCollections(client: SupabaseClient, user: User): Promise<GalleryCollection[]> {
  const response = await client
    .from("gallery_collections")
    .select("id,owner_id,title,description,visibility,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (response.error) throw new Error(`GALLERY_COLLECTION_LIST_FAILED:${response.error.message}`);
  return (response.data ?? []).flatMap((row) => {
    const collection = parseGalleryCollection(row);
    return collection ? [collection] : [];
  });
}

export async function listPublicGalleryCollections(client: SupabaseClient, limit = 6): Promise<GalleryCollection[]> {
  const response = await client
    .from("gallery_collections")
    .select("id,owner_id,title,description,visibility,created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (response.error) throw new Error(`GALLERY_PUBLIC_COLLECTION_LIST_FAILED:${response.error.message}`);
  return (response.data ?? []).flatMap((row) => {
    const collection = parseGalleryCollection(row);
    return collection ? [collection] : [];
  });
}

export async function createGalleryCollection(options: {
  client: SupabaseClient;
  description?: string;
  title: string;
  user: User;
  visibility: GalleryCollectionVisibility;
}): Promise<GalleryCollection> {
  const input = normalizeGalleryCollectionInput(options);
  const response = await options.client
    .from("gallery_collections")
    .insert({ description: input.description, owner_id: options.user.id, title: input.title, visibility: input.visibility })
    .select("id,owner_id,title,description,visibility,created_at")
    .single();
  if (response.error) throw new Error(`GALLERY_COLLECTION_CREATE_FAILED:${response.error.message}`);
  const collection = parseGalleryCollection(response.data);
  if (!collection) throw new Error("GALLERY_COLLECTION_INVALID");
  return collection;
}

export async function createGalleryCollectionWithPost(options: {
  client: SupabaseClient;
  description?: string;
  postId: string;
  title: string;
  visibility: GalleryCollectionVisibility;
}): Promise<GalleryCollection> {
  const input = normalizeGalleryCollectionInput(options);
  const response = await options.client
    .rpc("create_gallery_collection_with_item", {
      description_input: input.description,
      post_id_input: options.postId,
      title_input: input.title,
      visibility_input: input.visibility,
    })
    .single();
  if (response.error) throw new Error(`GALLERY_COLLECTION_CREATE_AND_SAVE_FAILED:${response.error.message}`);
  const collection = parseGalleryCollection(response.data);
  if (!collection) throw new Error("GALLERY_COLLECTION_INVALID");
  return collection;
}

export async function saveGalleryPostToCollection(options: { client: SupabaseClient; collectionId: string; postId: string }): Promise<void> {
  const response = await options.client
    .from("gallery_collection_items")
    .insert({ collection_id: options.collectionId, post_id: options.postId });
  if (response.error) throw new Error(`GALLERY_COLLECTION_SAVE_FAILED:${response.error.message}`);
}

export async function getGalleryCollectionDetail(client: SupabaseClient, collectionId: string): Promise<GalleryCollectionDetail> {
  const response = await client
    .from("gallery_collections")
    .select("id,owner_id,title,description,visibility,created_at,gallery_collection_items(post_id,added_at,gallery_posts(id,owner_id,project_id,version_id,title,dsl,engine_version,glyph_asset_version,remix_source_id,status,review_reason,published_at,created_at))")
    .eq("id", collectionId)
    .single();
  if (response.error) throw new Error(`GALLERY_COLLECTION_DETAIL_FAILED:${response.error.message}`);
  const collection = parseGalleryCollection(response.data);
  if (!collection || !isRecord(response.data)) throw new Error("GALLERY_COLLECTION_INVALID");
  const items = Array.isArray(response.data.gallery_collection_items) ? response.data.gallery_collection_items : [];
  const itemsWithPosts = items.flatMap((item) => {
    if (!isRecord(item)) return [];
    const post = parseGalleryPost(item.gallery_posts);
    const addedAt = stringValue(item.added_at);
    return post && addedAt ? [{ addedAt, post }] : [];
  });
  itemsWithPosts.sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  return { collection, posts: itemsWithPosts.map((item) => item.post) };
}

export async function submitGalleryPost(options: {
  client: SupabaseClient;
  user: User;
  projectId: string;
  version: SealProjectVersion;
  title: string;
}): Promise<GalleryPost> {
  const trimmedTitle = options.title.trim();
  if (trimmedTitle.length > 80) throw new Error("GALLERY_TITLE_TOO_LONG");
  const response = await options.client
    .from("gallery_posts")
    .insert({
      dsl: options.version.dsl,
      engine_version: options.version.engineVersion,
      glyph_asset_version: options.version.assetVersion,
      owner_id: options.user.id,
      project_id: options.projectId,
      remix_source_id: getGalleryRemixSourceId(options.version.dsl),
      title: trimmedTitle || null,
      version_id: options.version.id,
    })
    .select("id,owner_id,project_id,version_id,title,dsl,engine_version,glyph_asset_version,remix_source_id,status,review_reason,published_at,created_at")
    .single();
  if (response.error) throw new Error(`GALLERY_SUBMIT_FAILED:${response.error.message}`);
  return requireGalleryPost(response.data);
}

export async function submitGalleryReport(options: {
  client: SupabaseClient;
  user: User;
  postId: string;
  reason: GalleryReportReason;
  detail?: string;
}): Promise<void> {
  const detail = options.detail?.trim() || null;
  if (detail && detail.length > 500) throw new Error("GALLERY_REPORT_TOO_LONG");
  const response = await options.client.from("gallery_reports").insert({
    detail,
    post_id: options.postId,
    reason: options.reason,
    reporter_id: options.user.id,
  });
  if (response.error) throw new Error(`GALLERY_REPORT_FAILED:${response.error.message}`);
}

export async function submitGalleryAppeal(options: {
  client: SupabaseClient;
  postId: string;
  reason: string;
  user: User;
}): Promise<GalleryAppeal> {
  const reason = options.reason.trim();
  if (reason.length < 5 || reason.length > 500) throw new Error("GALLERY_APPEAL_REASON_INVALID");
  const response = await options.client
    .from("gallery_appeals")
    .insert({ appellant_id: options.user.id, post_id: options.postId, reason })
    .select("id,post_id,reason,status,reviewer_note,created_at")
    .single();
  if (response.error) throw new Error(`GALLERY_APPEAL_FAILED:${response.error.message}`);
  const appeal = parseGalleryAppeal(response.data);
  if (!appeal) throw new Error("GALLERY_APPEAL_INVALID");
  return appeal;
}
