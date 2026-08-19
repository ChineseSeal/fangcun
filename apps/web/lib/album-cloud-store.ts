import type { AlbumLayout, AlbumPageSize, AlbumPerPage } from "@fangcun/album";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { SealProject, SealProjectVersion } from "./project-store";

const ALBUM_PER_PAGE_VALUES = [1, 2, 4, 6, 9] as const;
const HISTORIC_SEAL_SLUGS = ["ying-qu", "da-fu", "xin-cheng-jia"] as const;
export const ALBUM_MAX_PAGES = 24;

export type AlbumDraftPage = {
  selectedHistoricSealSlugs: string[];
  selectedProjectIds: string[];
  selectedProjectVersionIds: Record<string, string>;
};

export type AlbumCloudDraft = {
  colophon: string;
  layout: AlbumLayout;
  pageSize: AlbumPageSize;
  pages: AlbumDraftPage[];
  perPage: AlbumPerPage;
  title: string;
};

export type ResolvedAlbumProject = {
  project: SealProject;
  version: SealProjectVersion;
};

export type CloudAlbumItem = {
  caption: string | null;
  historicSealSlug: string | null;
  page: number;
  projectId: string | null;
  slot: number;
  versionId: string | null;
};

export type CloudAlbum = {
  colophon: string;
  createdAt: string;
  id: string;
  items: CloudAlbumItem[];
  layout: AlbumLayout;
  pageCount: number;
  pageSize: AlbumPageSize;
  perPage: AlbumPerPage;
  title: string;
  updatedAt: string;
};

type CloudAlbumRow = {
  album_items: unknown;
  colophon: unknown;
  created_at: unknown;
  id: unknown;
  layout: unknown;
  page_count: unknown;
  page_size: unknown;
  per_page: unknown;
  title: unknown;
  updated_at: unknown;
};

type CloudAlbumItemRow = {
  caption: unknown;
  historic_seal_slug: unknown;
  page: unknown;
  project_id: unknown;
  slot: unknown;
  version_id: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isAlbumLayout(value: unknown): value is AlbumLayout {
  return value === "ceye" || value === "jingzhe" || value === "grid";
}

function isAlbumPageSize(value: unknown): value is AlbumPageSize {
  return value === "a4" || value === "a5";
}

function isAlbumPerPage(value: unknown): value is AlbumPerPage {
  return typeof value === "number" && (ALBUM_PER_PAGE_VALUES as readonly number[]).includes(value);
}

function isPageCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= ALBUM_MAX_PAGES;
}

function isHistoricSealSlug(value: unknown): value is (typeof HISTORIC_SEAL_SLUGS)[number] {
  return typeof value === "string" && (HISTORIC_SEAL_SLUGS as readonly string[]).includes(value);
}

function uniqueStrings(values: readonly unknown[], maxLength: number): string[] {
  const selected = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.length > 0 && value.length <= maxLength) selected.add(value);
  }
  return [...selected];
}

export function createAlbumDraftPage(): AlbumDraftPage {
  return {
    selectedHistoricSealSlugs: [],
    selectedProjectIds: [],
    selectedProjectVersionIds: {},
  };
}

function parseCloudAlbumItem(value: unknown): CloudAlbumItem | null {
  if (!isRecord(value)) return null;
  const row = value as CloudAlbumItemRow;
  const projectId = stringValue(row.project_id);
  const versionId = stringValue(row.version_id);
  const historicSealSlug = stringValue(row.historic_seal_slug);
  const page = isPageCount(row.page) ? row.page : null;
  const slot = typeof row.slot === "number" && Number.isInteger(row.slot) && row.slot >= 1 && row.slot <= 9 ? row.slot : null;
  const projectReference = Boolean(projectId && versionId && !historicSealSlug);
  const historicReference = !projectId && !versionId && isHistoricSealSlug(historicSealSlug);
  if (!page || !slot || (!projectReference && !historicReference)) return null;
  return {
    caption: stringValue(row.caption),
    historicSealSlug: historicReference ? historicSealSlug : null,
    page,
    projectId: projectReference ? projectId : null,
    slot,
    versionId: projectReference ? versionId : null,
  };
}

export function parseCloudAlbum(value: unknown): CloudAlbum | null {
  if (!isRecord(value)) return null;
  const row = value as CloudAlbumRow;
  const id = stringValue(row.id);
  const title = stringValue(row.title);
  const colophon = typeof row.colophon === "string" ? row.colophon : null;
  const createdAt = stringValue(row.created_at);
  const updatedAt = stringValue(row.updated_at);
  const perPage = isAlbumPerPage(row.per_page) ? row.per_page : null;
  const pageCount = isPageCount(row.page_count) ? row.page_count : null;
  if (!id || !title || colophon === null || !createdAt || !updatedAt || !isAlbumLayout(row.layout) || !isAlbumPageSize(row.page_size) || !perPage || !pageCount) return null;
  const sourceItems = Array.isArray(row.album_items) ? row.album_items : [];
  const items = sourceItems
    .map(parseCloudAlbumItem)
    .filter((item): item is CloudAlbumItem => item !== null)
    .sort((left, right) => left.page - right.page || left.slot - right.slot);
  const uniqueSlots = new Set(items.map((item) => `${item.page}:${item.slot}`));
  const uniqueSources = new Set(items.map((item) => `${item.page}:${item.historicSealSlug ? `historic:${item.historicSealSlug}` : `project:${item.projectId}:${item.versionId}`}`));
  if (
    items.length !== sourceItems.length
    || items.length > perPage * pageCount
    || items.some((item) => item.page > pageCount || item.slot > perPage)
    || uniqueSlots.size !== items.length
    || uniqueSources.size !== items.length
  ) return null;
  return {
    colophon,
    createdAt,
    id,
    items,
    layout: row.layout,
    pageCount,
    pageSize: row.page_size,
    perPage,
    title,
    updatedAt,
  };
}

export function resolveAlbumProjectReferences(
  draft: Pick<AlbumDraftPage, "selectedProjectIds" | "selectedProjectVersionIds">,
  projects: readonly SealProject[],
): { missingProjectIds: string[]; resolved: ResolvedAlbumProject[] } {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const missingProjectIds: string[] = [];
  const resolved: ResolvedAlbumProject[] = [];
  for (const projectId of uniqueStrings(draft.selectedProjectIds, 128)) {
    const project = byId.get(projectId);
    const requestedVersionId = draft.selectedProjectVersionIds[projectId];
    const version = project?.versions.find((candidate) => candidate.id === requestedVersionId)
      ?? (requestedVersionId ? null : project?.versions.find((candidate) => candidate.id === project.currentVersionId) ?? project?.versions.at(-1) ?? null);
    if (!project || !version) {
      missingProjectIds.push(projectId);
      continue;
    }
    resolved.push({ project, version });
  }
  return { missingProjectIds, resolved };
}

export function cloudAlbumToDraft(album: CloudAlbum): AlbumCloudDraft {
  const pages = Array.from({ length: album.pageCount }, createAlbumDraftPage);
  for (const item of album.items) {
    const page = pages[item.page - 1];
    if (item.projectId && item.versionId) {
      page.selectedProjectIds.push(item.projectId);
      page.selectedProjectVersionIds[item.projectId] = item.versionId;
    } else if (item.historicSealSlug) {
      page.selectedHistoricSealSlugs.push(item.historicSealSlug);
    }
  }
  return {
    colophon: album.colophon,
    layout: album.layout,
    pageSize: album.pageSize,
    pages,
    perPage: album.perPage,
    title: album.title,
  };
}

export function createCloudAlbumSaveInput(options: {
  albumId?: string | null;
  draft: AlbumCloudDraft;
  projects: readonly SealProject[];
  historicCaptions: Readonly<Record<string, string>>;
}): {
  album_id_input: string | null;
  colophon_input: string;
  items_input: Array<Record<string, string | number | null>>;
  layout_input: AlbumLayout;
  page_count_input: number;
  page_size_input: AlbumPageSize;
  per_page_input: AlbumPerPage;
  title_input: string;
} {
  const title = options.draft.title.trim();
  const colophon = options.draft.colophon.trim();
  const pages = options.draft.pages;
  if (!title || title.length > 40 || colophon.length > 120 || !Array.isArray(pages) || pages.length < 1 || pages.length > ALBUM_MAX_PAGES) throw new Error("CLOUD_ALBUM_DRAFT_INVALID");
  const missingProjectIds = new Set<string>();
  const itemsInput: Array<Record<string, string | number | null>> = [];
  for (const [pageIndex, page] of pages.entries()) {
    const { missingProjectIds: missing, resolved } = resolveAlbumProjectReferences(page, options.projects);
    missing.forEach((projectId) => missingProjectIds.add(projectId));
    const historicSlugs = uniqueStrings(page.selectedHistoricSealSlugs, 80).filter(isHistoricSealSlug);
    const sources = [
      ...resolved.map(({ project, version }) => ({ caption: project.name, historicSealSlug: null, projectId: project.id, versionId: version.id })),
      ...historicSlugs.map((slug) => ({ caption: options.historicCaptions[slug] ?? slug, historicSealSlug: slug, projectId: null, versionId: null })),
    ];
    if (sources.length > options.draft.perPage) throw new Error("CLOUD_ALBUM_ITEMS_OVERFLOW");
    sources.forEach((source, index) => {
      itemsInput.push({
        caption: source.caption,
        historic_seal_slug: source.historicSealSlug,
        page: pageIndex + 1,
        project_id: source.projectId,
        slot: index + 1,
        version_id: source.versionId,
      });
    });
  }
  if (missingProjectIds.size > 0) throw new Error("CLOUD_ALBUM_PROJECT_SNAPSHOT_MISSING");
  return {
    album_id_input: options.albumId ?? null,
    colophon_input: colophon,
    items_input: itemsInput,
    layout_input: options.draft.layout,
    page_count_input: pages.length,
    page_size_input: options.draft.pageSize,
    per_page_input: options.draft.perPage,
    title_input: title,
  };
}

export async function listCloudAlbums(client: SupabaseClient, user: User): Promise<CloudAlbum[]> {
  const { data, error } = await client
    .from("albums")
    .select("id,title,layout,page_size,per_page,page_count,colophon,created_at,updated_at,album_items(project_id,version_id,historic_seal_slug,page,slot,caption)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`CLOUD_ALBUM_LIST_FAILED:${error.message}`);
  return (data ?? []).map(parseCloudAlbum).filter((album): album is CloudAlbum => album !== null);
}

export async function saveCloudAlbum(options: {
  albumId?: string | null;
  client: SupabaseClient;
  draft: AlbumCloudDraft;
  historicCaptions: Readonly<Record<string, string>>;
  projects: readonly SealProject[];
}): Promise<string> {
  const { data, error } = await options.client.rpc("save_album", createCloudAlbumSaveInput(options));
  if (error || typeof data !== "string" || !data) throw new Error(`CLOUD_ALBUM_SAVE_FAILED:${error?.message ?? "INVALID_ID"}`);
  return data;
}

export async function deleteCloudAlbum(options: { albumId: string; client: SupabaseClient; user: User }): Promise<void> {
  const { error } = await options.client.from("albums").delete().eq("id", options.albumId).eq("user_id", options.user.id);
  if (error) throw new Error(`CLOUD_ALBUM_DELETE_FAILED:${error.message}`);
}
