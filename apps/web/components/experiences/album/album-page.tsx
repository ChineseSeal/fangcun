"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createAlbumPage, type AlbumItem, type AlbumLayout, type AlbumPageSize, type AlbumPerPage } from "@fangcun/album";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { getProjectCurrentVersion, readProjectLibrary, type ProjectLibrary, type SealProject, type SealProjectVersion } from "@/lib/project-store";
import {
  createHistoricAlbumItem,
  findAlbumHistoricReference,
  HISTORIC_ALBUM_DRAG_TYPE,
  normalizeHistoricSealSlugs,
} from "@/lib/album-historic-reference";
import {
  ALBUM_MAX_PAGES,
  cloudAlbumToDraft,
  createAlbumDraftPage,
  deleteCloudAlbum,
  listCloudAlbums,
  resolveAlbumProjectReferences,
  saveCloudAlbum,
  type AlbumCloudDraft,
  type AlbumDraftPage,
  type CloudAlbum,
} from "@/lib/album-cloud-store";
import {
  createCloudAlbumShare,
  listCloudAlbumShares,
  revokeCloudAlbumShare,
  type CloudAlbumShare,
} from "@/lib/album-share-cloud-store";
import { historicSealEntries, type HistoricSealEntry } from "@fangcun/knowledge/historic-seals";
import { isEnglish, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, readSupabasePublicConfig } from "@/lib/supabase-browser";
import styles from "./album-page.module.css";

const ALBUM_DRAFT_KEY = "fangcun:album:draft:v2";
const LEGACY_ALBUM_DRAFT_KEY = "fangcun:album:draft:v1";
const svgCache = new Map<string, string>();
const svgRequests = new Map<string, Promise<string>>();
const ALBUM_RENDER_CONCURRENCY = 6;

type AlbumDraft = AlbumCloudDraft;

const defaultDraft: AlbumDraft = {
  title: "我的第一本印谱",
  colophon: "方寸 Fangcun · 由 Seal DSL 派生",
  layout: "grid",
  pageSize: "a4",
  pages: [createAlbumDraftPage()],
  perPage: 4,
};

function localize(english: boolean, zh: string, en: string): string { return english ? en : zh; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSelectedProjectVersionIds(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([projectId, versionId]) => (
    projectId.length > 0 && projectId.length <= 128 && typeof versionId === "string" && versionId.length > 0 && versionId.length <= 128
      ? [[projectId, versionId] as const]
      : []
  )));
}

function readAlbumDraftPage(value: unknown, perPage: AlbumPerPage): AlbumDraftPage {
  if (!isRecord(value)) return createAlbumDraftPage();
  const selectedProjectIds = Array.isArray(value.selectedProjectIds)
    ? [...new Set(value.selectedProjectIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 128))].slice(0, perPage)
    : [];
  const allVersionIds = readSelectedProjectVersionIds(value.selectedProjectVersionIds);
  return {
    selectedHistoricSealSlugs: normalizeHistoricSealSlugs(value.selectedHistoricSealSlugs).slice(0, Math.max(0, perPage - selectedProjectIds.length)),
    selectedProjectIds,
    selectedProjectVersionIds: Object.fromEntries(selectedProjectIds.flatMap((projectId) => allVersionIds[projectId] ? [[projectId, allVersionIds[projectId]] as const] : [])),
  };
}

function parseDraft(value: unknown, legacy: boolean): AlbumDraft | null {
  if (!isRecord(value)) return null;
  const perPage = [1, 2, 4, 6, 9].includes(value.perPage as number) ? value.perPage as AlbumPerPage : defaultDraft.perPage;
  const pages = Array.isArray(value.pages)
    ? value.pages.slice(0, ALBUM_MAX_PAGES).map((page) => readAlbumDraftPage(page, perPage))
    : legacy ? [readAlbumDraftPage(value, perPage)] : [];
  if (pages.length === 0) return null;
  return {
    colophon: typeof value.colophon === "string" ? value.colophon.slice(0, 120) : defaultDraft.colophon,
    layout: value.layout === "ceye" || value.layout === "jingzhe" || value.layout === "grid" ? value.layout : defaultDraft.layout,
    pageSize: value.pageSize === "a5" ? "a5" : "a4",
    pages,
    perPage,
    title: typeof value.title === "string" && value.title.trim() ? value.title.slice(0, 40) : defaultDraft.title,
  };
}

function readDraft(): AlbumDraft {
  try {
    const current = parseDraft(JSON.parse(window.localStorage.getItem(ALBUM_DRAFT_KEY) || "null"), false);
    if (current) return current;
    return parseDraft(JSON.parse(window.localStorage.getItem(LEGACY_ALBUM_DRAFT_KEY) || "null"), true) ?? defaultDraft;
  } catch {
    return defaultDraft;
  }
}

function saveDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

async function loadSvg(dsl: AlbumItem["dsl"], locale: Locale): Promise<string> {
  const key = `${locale}:${JSON.stringify(dsl)}`;
  const cached = svgCache.get(key);
  if (cached) return cached;
  const inFlight = svgRequests.get(key);
  if (inFlight) return inFlight;
  const request = fetch("/api/seals/render", { body: JSON.stringify({ dsl, locale }), headers: { "content-type": "application/json" }, method: "POST" })
    .then(async (response) => {
      const data = await response.json() as { svg?: string };
      if (!response.ok || !data.svg) throw new Error("ALBUM_RENDER_FAILED");
      svgCache.set(key, data.svg);
      return data.svg;
    });
  svgRequests.set(key, request);
  try {
    return await request;
  } finally {
    svgRequests.delete(key);
  }
}

async function svgToPng(svg: string, widthMm: number, heightMm: number): Promise<Blob> {
  const scale = 4;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthMm / 25.4 * 96 * scale);
  canvas.height = Math.round(heightMm / 25.4 * 96 * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ALBUM_CANVAS_FAILED");
  context.fillStyle = "#FBF8F1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("ALBUM_PNG_FAILED")), "image/png"));
}

function currentProjects(library: ProjectLibrary | null): SealProject[] {
  return library?.projects.filter((project) => !project.archivedAt) ?? [];
}

function trimPageSelections(current: AlbumDraftPage, perPage: AlbumPerPage): AlbumDraftPage {
  const selectedProjectIds = current.selectedProjectIds.slice(0, perPage);
  return {
    selectedHistoricSealSlugs: current.selectedHistoricSealSlugs.slice(0, Math.max(0, perPage - selectedProjectIds.length)),
    selectedProjectIds,
    selectedProjectVersionIds: Object.fromEntries(selectedProjectIds.flatMap((id) => current.selectedProjectVersionIds[id] ? [[id, current.selectedProjectVersionIds[id]] as const] : [])),
  };
}

type AlbumItemSelection =
  | { kind: "project"; project: SealProject; version: SealProjectVersion }
  | { entry: HistoricSealEntry; kind: "historic" };

function collectAlbumItemSelections(draftPage: AlbumDraftPage, projects: readonly SealProject[], perPage: AlbumPerPage): {
  missingProjectIds: string[];
  selections: AlbumItemSelection[];
} {
  const projectReferences = resolveAlbumProjectReferences(draftPage, projects);
  const historicReferences = draftPage.selectedHistoricSealSlugs.flatMap((slug) => {
    const entry = findAlbumHistoricReference(slug);
    return entry ? [entry] : [];
  });
  return {
    missingProjectIds: projectReferences.missingProjectIds,
    selections: [
      ...projectReferences.resolved.map(({ project, version }) => ({ kind: "project" as const, project, version })),
      ...historicReferences.map((entry) => ({ entry, kind: "historic" as const })),
    ].slice(0, perPage),
  };
}

async function mapWithConcurrency<Value, Result>(
  values: readonly Value[],
  limit: number,
  map: (value: Value, index: number) => Promise<Result>,
): Promise<Result[]> {
  if (values.length === 0) return [];
  const results = new Array<Result>(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await map(values[index]!, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function renderAlbumItemSelections(selections: readonly AlbumItemSelection[], locale: Locale): Promise<AlbumItem[]> {
  return mapWithConcurrency(selections, ALBUM_RENDER_CONCURRENCY, async (selection) => {
    if (selection.kind === "project") {
      return {
        caption: selection.project.name,
        dsl: selection.version.dsl,
        id: selection.project.id,
        source: `v${selection.version.number}`,
        svg: await loadSvg(selection.version.dsl, locale),
      } satisfies AlbumItem;
    }
    return createHistoricAlbumItem(selection.entry, await loadSvg(selection.entry.dsl as AlbumItem["dsl"], locale), locale);
  });
}

export function AlbumPage({ locale = "zh-Hans" }: { locale?: Locale }) {
  const english = isEnglish(locale);
  const copy = useCallback((zh: string, en: string) => english ? en : zh, [english]);
  const [library, setLibrary] = useState<ProjectLibrary | null>(null);
  const [draft, setDraft] = useState<AlbumDraft>(defaultDraft);
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [status, setStatus] = useState(copy("正在读取本地项目…", "Reading local projects..."));
  const [busy, setBusy] = useState<"png" | "pdf" | "book-pdf" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [queryHistoricSlug, setQueryHistoricSlug] = useState("");
  const [isHistoricDropTarget, setIsHistoricDropTarget] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [cloudAvailability, setCloudAvailability] = useState<"checking" | "ready" | "signed-out" | "unconfigured">("checking");
  const [cloudAlbums, setCloudAlbums] = useState<CloudAlbum[]>([]);
  const [cloudShares, setCloudShares] = useState<CloudAlbumShare[]>([]);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [activeCloudAlbumId, setActiveCloudAlbumId] = useState<string | null>(null);
  const [cloudAction, setCloudAction] = useState<"delete" | "revoke-share" | "save" | "share" | null>(null);
  const [cloudStatus, setCloudStatus] = useState("");
  const appliedHistoricQuery = useRef<string | null>(null);

  useEffect(() => {
    setLibrary(readProjectLibrary(window.localStorage));
    setDraft(readDraft());
    setQueryHistoricSlug(new URLSearchParams(window.location.search).get("historic") || "");
    setHydrated(true);
  }, []);

  const refreshCloudAlbums = useCallback(async (client: SupabaseClient, user: User) => {
    try {
      const [nextAlbums, nextShares] = await Promise.all([
        listCloudAlbums(client, user),
        listCloudAlbumShares(client, user),
      ]);
      setCloudAlbums(nextAlbums);
      setCloudShares(nextShares);
      setCloudAvailability("ready");
    } catch {
      setCloudStatus(copy("云端印谱暂时无法读取；本地草稿仍安全保留。", "Cloud albums could not be read. Your local draft remains safe."));
    }
  }, [copy]);

  useEffect(() => {
    if (!readSupabasePublicConfig()) {
      setCloudAvailability("unconfigured");
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setCloudAvailability("unconfigured");
      return;
    }
    let active = true;
    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setCloudUser(null);
        setCloudAvailability("signed-out");
        return;
      }
      setCloudUser(data.user);
      void refreshCloudAlbums(client, data.user);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCloudUser(user);
      if (!user) {
        setCloudAlbums([]);
        setCloudShares([]);
        setActiveCloudAlbumId(null);
        setCloudAvailability("signed-out");
        return;
      }
      void refreshCloudAlbums(client, user);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshCloudAlbums]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(ALBUM_DRAFT_KEY, JSON.stringify(draft));
      window.localStorage.removeItem(LEGACY_ALBUM_DRAFT_KEY);
    } catch {
      // Private browsing or a full quota must not interrupt local editing.
    }
  }, [draft, hydrated]);

  const projects = useMemo(() => currentProjects(library), [library]);
  const activeDraftPage = draft.pages[currentPageIndex] ?? draft.pages[0] ?? createAlbumDraftPage();
  const currentPageNumber = Math.min(currentPageIndex + 1, draft.pages.length);
  const page = useMemo(() => createAlbumPage(items, {
    colophon: draft.colophon,
    layout: draft.layout,
    locale,
    pageNumber: currentPageNumber,
    pageSize: draft.pageSize,
    perPage: draft.perPage,
    title: draft.title,
  }), [currentPageNumber, draft.colophon, draft.layout, draft.pageSize, draft.perPage, draft.title, items, locale]);

  useEffect(() => {
    if (!hydrated || !queryHistoricSlug || appliedHistoricQuery.current === queryHistoricSlug) return;
    appliedHistoricQuery.current = queryHistoricSlug;
    const entry = findAlbumHistoricReference(queryHistoricSlug);
    if (!entry) {
      setStatus(copy("未找到这枚历史印参考。", "That historic reference was not found."));
      return;
    }
    setDraft((current) => {
      const target = current.pages[currentPageIndex] ?? current.pages[0];
      if (!target || target.selectedHistoricSealSlugs.includes(entry.slug)) return current;
      if (target.selectedProjectIds.length + target.selectedHistoricSealSlugs.length >= current.perPage) {
        setStatus(copy("本页已满；可从左侧调整选择后再加入历史印参考。", "This page is full. Adjust the selection on the left before adding the historic reference."));
        return current;
      }
      return {
        ...current,
        pages: current.pages.map((candidate, index) => index === currentPageIndex ? { ...candidate, selectedHistoricSealSlugs: [...candidate.selectedHistoricSealSlugs, entry.slug] } : candidate),
      };
    });
  }, [copy, currentPageIndex, hydrated, queryHistoricSlug]);

  useEffect(() => {
    let active = true;
    const { missingProjectIds, selections } = collectAlbumItemSelections(activeDraftPage, projects, draft.perPage);
    if (missingProjectIds.length > 0) {
      setItems([]);
      setStatus(copy("云端印谱引用的项目版本尚未同步到此设备；请先同步账户后再打开。", "A project snapshot referenced by this cloud album is not synced to this device. Sync your account, then open it again."));
      return () => { active = false; };
    }
    if (selections.length === 0) {
      setItems([]);
      setStatus(localize(english, "请选择左侧项目，或加入历史印教学参考。", "Select projects on the left or add a historic teaching reference."));
      return () => { active = false; };
    }
    setStatus(localize(english, "正在生成印谱页面…", "Rendering album page..."));
    renderAlbumItemSelections(selections, locale)
      .then((next) => {
        if (active) {
          setItems(next);
          setStatus(localize(english, "页面已更新，可导出 PNG / PDF。", "Page updated. PNG and PDF are ready."));
        }
      })
      .catch(() => { if (active) setStatus(localize(english, "印面生成失败，请重试。", "A seal failed to render. Try again.")); });
    return () => { active = false; };
  }, [activeDraftPage, copy, draft.perPage, english, locale, projects]);

  function updateDraft(patch: Partial<Omit<AlbumDraft, "pages">>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateActivePage(next: (current: AlbumDraftPage) => AlbumDraftPage) {
    setDraft((current) => ({
      ...current,
      pages: current.pages.map((candidate, index) => index === currentPageIndex ? next(candidate) : candidate),
    }));
  }

  function toggleProject(project: SealProject, checked: boolean) {
    const version = getProjectCurrentVersion(project);
    updateActivePage((current) => ({
      ...current,
      selectedProjectIds: checked
        ? [...current.selectedProjectIds, project.id]
        : current.selectedProjectIds.filter((id) => id !== project.id),
      selectedProjectVersionIds: checked
        ? { ...current.selectedProjectVersionIds, [project.id]: version.id }
        : Object.fromEntries(Object.entries(current.selectedProjectVersionIds).filter(([id]) => id !== project.id)),
    }));
  }

  function addHistoricReference(slug: string) {
    const entry = findAlbumHistoricReference(slug);
    if (!entry) return;
    setDraft((current) => {
      const target = current.pages[currentPageIndex] ?? current.pages[0];
      if (!target || target.selectedHistoricSealSlugs.includes(entry.slug)) return current;
      if (target.selectedProjectIds.length + target.selectedHistoricSealSlugs.length >= current.perPage) {
        setStatus(copy("本页已满；请先移出一枚印。", "This page is full. Remove a seal first."));
        return current;
      }
      return {
        ...current,
        pages: current.pages.map((candidate, index) => index === currentPageIndex ? { ...candidate, selectedHistoricSealSlugs: [...candidate.selectedHistoricSealSlugs, entry.slug] } : candidate),
      };
    });
  }

  function removeHistoricReference(slug: string) {
    updateActivePage((current) => ({ ...current, selectedHistoricSealSlugs: current.selectedHistoricSealSlugs.filter((item) => item !== slug) }));
  }

  function addPage() {
    if (draft.pages.length >= ALBUM_MAX_PAGES) {
      setStatus(copy(`印谱最多 ${ALBUM_MAX_PAGES} 页。`, `An album can have up to ${ALBUM_MAX_PAGES} pages.`));
      return;
    }
    const nextIndex = draft.pages.length;
    setDraft((current) => ({ ...current, pages: [...current.pages, createAlbumDraftPage()] }));
    setCurrentPageIndex(nextIndex);
    setStatus(copy(`已新增第 ${nextIndex + 1} 页。`, `Page ${nextIndex + 1} was added.`));
  }

  function removeCurrentPage() {
    if (draft.pages.length <= 1) return;
    const nextIndex = Math.min(currentPageIndex, draft.pages.length - 2);
    setDraft((current) => ({ ...current, pages: current.pages.filter((_, index) => index !== currentPageIndex) }));
    setCurrentPageIndex(nextIndex);
    setStatus(copy("已删除当前页；其他页面不受影响。", "The current page was removed. Other pages are unchanged."));
  }

  function setPerPage(perPage: AlbumPerPage) {
    setDraft((current) => ({ ...current, perPage, pages: current.pages.map((albumPage) => trimPageSelections(albumPage, perPage)) }));
  }

  async function saveToCloud(saveAsNew: boolean) {
    const client = getSupabaseBrowserClient();
    if (!client || !cloudUser) return;
    setCloudAction("save");
    try {
      const historicCaptions = Object.fromEntries(historicSealEntries.map((entry) => [entry.slug, entry.shortTitle]));
      const albumId = await saveCloudAlbum({
        albumId: saveAsNew ? null : activeCloudAlbumId,
        client,
        draft,
        historicCaptions,
        projects,
      });
      setActiveCloudAlbumId(albumId);
      await refreshCloudAlbums(client, cloudUser);
      setCloudStatus(copy(
        saveAsNew ? "已保存为多页云端印谱；仅你的账户可读取。" : "云端印谱已更新；仍只保存项目版本引用与受控历史参考。",
        saveAsNew ? "Saved as a multi-page cloud album. Only your account can read it." : "Cloud album updated. It still stores only project-version references and canonical historic references.",
      ));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setCloudStatus(code.includes("PROJECT_SNAPSHOT") || code.includes("ALBUM_PROJECT_SNAPSHOT_INVALID")
        ? copy("请先到“账户与同步”同步所有页面选中的项目版本，再保存云端印谱。", "Sync the project versions selected on every page in Account before saving this cloud album.")
        : copy("云端印谱保存失败；本地草稿没有丢失。", "Cloud album save failed. Your local draft was not lost."));
    } finally {
      setCloudAction(null);
    }
  }

  function loadCloudAlbum(album: CloudAlbum) {
    setDraft(cloudAlbumToDraft(album));
    setCurrentPageIndex(0);
    setActiveCloudAlbumId(album.id);
    setCloudStatus(copy(`已载入《${album.title}》；会严格使用已保存的版本引用。`, `Loaded “${album.title}” with its saved version references.`));
  }

  async function removeCloudAlbum(album: CloudAlbum) {
    const client = getSupabaseBrowserClient();
    if (!client || !cloudUser || !window.confirm(copy(`删除云端印谱《${album.title}》？本机草稿不会受影响。`, `Delete cloud album “${album.title}”? Your local draft will not change.`))) return;
    setCloudAction("delete");
    try {
      await deleteCloudAlbum({ albumId: album.id, client, user: cloudUser });
      if (activeCloudAlbumId === album.id) setActiveCloudAlbumId(null);
      await refreshCloudAlbums(client, cloudUser);
      setCloudStatus(copy("云端印谱已删除；本机草稿仍保留。", "Cloud album deleted. Your local draft remains."));
    } catch {
      setCloudStatus(copy("无法删除云端印谱，请稍后重试。", "Could not delete the cloud album. Try again later."));
    } finally {
      setCloudAction(null);
    }
  }

  async function createOrRefreshCloudShare() {
    const client = getSupabaseBrowserClient();
    if (!client || !cloudUser || !activeCloudAlbumId) return;
    const existing = cloudShares.find((share) => share.albumId === activeCloudAlbumId);
    const confirmed = window.confirm(existing
      ? copy("刷新链接会立即让旧链接失效，并以当前云端保存的项目版本创建新快照。继续？", "Refreshing replaces the old link immediately and creates a new snapshot from the currently saved project versions. Continue?")
      : copy("创建链接后，任何获得链接的人都能只读查看此云端印谱的固定项目快照；历史印教学参考不会被分享。继续？", "Anyone with this link can read the pinned project snapshots in this cloud album. Historic teaching references are never shared. Continue?"));
    if (!confirmed) return;
    setCloudAction("share");
    try {
      await createCloudAlbumShare({ albumId: activeCloudAlbumId, client });
      await refreshCloudAlbums(client, cloudUser);
      setCloudStatus(existing
        ? copy("分享链接已刷新；旧链接已失效，当前链接固定为最新云端快照。", "The share link was refreshed. The old link is invalid and the new link is pinned to the latest cloud snapshot.")
        : copy("分享链接已创建；它只读、可撤销，且固定为当前云端快照。", "The share link was created. It is read-only, revocable, and pinned to the current cloud snapshot."));
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setCloudStatus(code.includes("HISTORIC_REFERENCE_UNSUPPORTED")
        ? copy("含历史印教学参考的云端印谱不能创建分享链接；请移除这些参考后另存，再创建链接。", "Albums containing historic teaching references cannot create a share link. Remove those references, save a new album, then create a link.")
        : code.includes("PROJECT_SNAPSHOT")
          ? copy("创建链接前，请先同步每一页所引用的项目版本。", "Before creating a link, sync every project version referenced by this album.")
          : copy("无法创建分享链接；云端印谱和本机草稿均未改变。", "Could not create a share link. The cloud album and local draft did not change."));
    } finally {
      setCloudAction(null);
    }
  }

  async function revokeCloudShare() {
    const client = getSupabaseBrowserClient();
    if (!client || !cloudUser || !activeCloudAlbumId) return;
    if (!window.confirm(copy("撤销后，当前分享链接会立即失效。继续？", "Revoking makes the current share link unavailable immediately. Continue?"))) return;
    setCloudAction("revoke-share");
    try {
      await revokeCloudAlbumShare({ albumId: activeCloudAlbumId, client });
      await refreshCloudAlbums(client, cloudUser);
      setCloudStatus(copy("分享链接已撤销；云端印谱仍仅你的账户可读取。", "The share link was revoked. The cloud album remains readable only by your account."));
    } catch {
      setCloudStatus(copy("无法撤销分享链接，请稍后重试。", "Could not revoke the share link. Try again later."));
    } finally {
      setCloudAction(null);
    }
  }

  async function copyCloudShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCloudStatus(copy("分享链接已复制。", "Share link copied."));
    } catch {
      setCloudStatus(copy("无法自动复制链接；可手动复制下方文本。", "The link could not be copied automatically. Copy the text below manually."));
    }
  }

  async function exportPng() {
    setBusy("png");
    try {
      saveDownload(await svgToPng(page.svg, page.widthMm, page.heightMm), `fangcun-album-page-${currentPageNumber}.png`);
      setStatus(copy("当前页 PNG 已导出。", "Current-page PNG exported."));
    } catch {
      setStatus(copy("PNG 导出失败。", "PNG export failed."));
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const response = await fetch("/api/albums/export", { body: JSON.stringify({ heightMm: page.heightMm, svg: page.svg, title: draft.title, widthMm: page.widthMm }), headers: { "content-type": "application/json" }, method: "POST" });
      if (!response.ok) throw new Error("ALBUM_PDF_FAILED");
      saveDownload(await response.blob(), `fangcun-album-page-${currentPageNumber}.pdf`);
      setStatus(copy("当前页 PDF 已导出；打印时请选择 100% / 实际大小。", "Current-page PDF exported. Print at 100% / actual size."));
    } catch {
      setStatus(copy("PDF 导出失败，请稍后重试。", "PDF export failed. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function exportBookPdf() {
    setBusy("book-pdf");
    try {
      const pages = await mapWithConcurrency(draft.pages, 2, async (draftPage, index) => {
        const { missingProjectIds, selections } = collectAlbumItemSelections(draftPage, projects, draft.perPage);
        if (missingProjectIds.length > 0) throw new Error("ALBUM_PROJECT_SNAPSHOT_MISSING");
        const pageItems = await renderAlbumItemSelections(selections, locale);
        return createAlbumPage(pageItems, {
          colophon: draft.colophon,
          layout: draft.layout,
          locale,
          pageNumber: index + 1,
          pageSize: draft.pageSize,
          perPage: draft.perPage,
          title: draft.title,
        });
      });
      const response = await fetch("/api/albums/export", {
        body: JSON.stringify({
          pages: pages.map((albumPage) => ({ heightMm: albumPage.heightMm, svg: albumPage.svg, widthMm: albumPage.widthMm })),
          title: draft.title,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("ALBUM_BOOK_PDF_FAILED");
      saveDownload(await response.blob(), "fangcun-album-book.pdf");
      setStatus(copy(`整册 ${pages.length} 页 PDF 已导出；打印时请选择 100% / 实际大小。`, `The ${pages.length}-page album PDF was exported. Print at 100% / actual size.`));
    } catch (error) {
      setStatus(error instanceof Error && error.message === "ALBUM_PROJECT_SNAPSHOT_MISSING"
        ? copy("整册 PDF 需要所有页面的固定项目版本；请先同步缺失项目。", "The book PDF needs every pinned project version. Sync the missing projects first.")
        : copy("整册 PDF 导出失败，请稍后重试。", "The album PDF could not be exported. Try again later."));
    } finally {
      setBusy(null);
    }
  }

  const selectedCount = activeDraftPage.selectedProjectIds.length + activeDraftPage.selectedHistoricSealSlugs.length;
  const albumItemCount = draft.pages.reduce((count, albumPage) => count + albumPage.selectedProjectIds.length + albumPage.selectedHistoricSealSlugs.length, 0);
  const activeCloudShare = cloudShares.find((share) => share.albumId === activeCloudAlbumId) ?? null;
  const activeCloudShareUrl = activeCloudShare ? `${window.location.origin}${english ? "/en" : ""}/album/share/${activeCloudShare.token}` : "";
  return <div className="paper-page">
    <SiteHeader locale={locale} />
    <main className={`page-container ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>P3 · ALBUM</span>
          <h1>{copy("印谱排版台", "Seal album studio")}</h1>
          <p>{copy("把已保存的印章快照与历史印教学参考排成可打印的多页印谱。印面仍来自同一份 Seal DSL，不复制或改写几何事实。", "Arrange saved seal snapshots and historic teaching references into a printable multi-page album. Impressions still come from the same Seal DSL and authoritative engine.")}</p>
        </div>
        <Link className="outline-button" href="/projects"><Icon name="history" />{copy("管理项目", "Manage projects")}</Link>
      </header>
      <div className={styles.layout}>
        <section className={`paper-panel ${styles.panel}`} aria-label={copy("选择印面", "Select impressions")}>
          <h2>{copy("我的印章", "My seals")}</h2>
          <p>{copy(`第 ${currentPageNumber} 页已选 ${selectedCount} / ${draft.perPage} 枚`, `Page ${currentPageNumber}: ${selectedCount} / ${draft.perPage} selected`)}</p>
          <div className={styles.projectList}>
            {projects.length === 0 ? <p>{copy("还没有已保存项目，请先创建并保存一枚印章。", "No saved projects yet. Create and save a seal first.")}</p> : projects.map((project) => {
              const version = getProjectCurrentVersion(project);
              const checked = activeDraftPage.selectedProjectIds.includes(project.id);
              return <label className={styles.projectOption} data-testid="album-project-option" key={project.id}>
                <input checked={checked} disabled={!checked && selectedCount >= draft.perPage} onChange={(event) => toggleProject(project, event.target.checked)} type="checkbox" />
                <span><strong>{project.name}</strong><small>{version.dsl.text} · v{version.number} · {version.dsl.physical.sizeMm} mm</small></span>
              </label>;
            })}
          </div>
          <section aria-labelledby="historic-reference-title" className={styles.historicReferences}>
            <div className={styles.historicHeading}>
              <h3 id="historic-reference-title">{copy("历史印参考", "Historic references")}</h3>
              <p>{copy("拖入当前页，或使用按钮加入。均为教学复原，不会复制为可编辑项目。", "Drag to the current page or use a button. These are teaching reconstructions, never editable project copies.")}</p>
            </div>
            <div className={styles.referenceList}>
              {historicSealEntries.map((entry) => {
                const selected = activeDraftPage.selectedHistoricSealSlugs.includes(entry.slug);
                const unavailable = !selected && selectedCount >= draft.perPage;
                return <div className={styles.referenceOption} data-testid="historic-album-reference" draggable key={entry.slug} onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(HISTORIC_ALBUM_DRAG_TYPE, entry.slug);
                  event.dataTransfer.setData("text/plain", entry.slug);
                }}>
                  <span><strong>{entry.shortTitle}</strong><small>{entry.period} · {entry.institution}</small></span>
                  <button aria-label={selected ? copy(`移出${entry.shortTitle}`, `Remove ${entry.shortTitle}`) : copy(`将${entry.shortTitle}加入当前页`, `Add ${entry.shortTitle} to the current page`)} disabled={unavailable} onClick={() => selected ? removeHistoricReference(entry.slug) : addHistoricReference(entry.slug)} type="button">
                    {selected ? copy("移出此页", "Remove") : unavailable ? copy("页面已满", "Page full") : copy("加入此页", "Add")}
                  </button>
                </div>;
              })}
            </div>
          </section>
        </section>
        <section className={styles.stage} aria-label={copy("印谱页面预览", "Album page preview")} onDragEnter={(event) => {
          if (event.dataTransfer.types.includes(HISTORIC_ALBUM_DRAG_TYPE)) setIsHistoricDropTarget(true);
        }} onDragLeave={() => setIsHistoricDropTarget(false)} onDragOver={(event) => {
          if (event.dataTransfer.types.includes(HISTORIC_ALBUM_DRAG_TYPE)) event.preventDefault();
        }} onDrop={(event) => {
          event.preventDefault();
          setIsHistoricDropTarget(false);
          addHistoricReference(event.dataTransfer.getData(HISTORIC_ALBUM_DRAG_TYPE));
        }}>
          <div className={styles.pageControls} aria-label={copy("印谱页面操作", "Album page controls")}>
            <button aria-label={copy("上一页", "Previous page")} disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex((index) => Math.max(0, index - 1))} type="button">{copy("上一页", "Previous")}</button>
            <strong data-testid="album-page-position">{copy(`第 ${currentPageNumber} / ${draft.pages.length} 页`, `Page ${currentPageNumber} / ${draft.pages.length}`)}</strong>
            <button aria-label={copy("下一页", "Next page")} disabled={currentPageIndex >= draft.pages.length - 1} onClick={() => setCurrentPageIndex((index) => Math.min(draft.pages.length - 1, index + 1))} type="button">{copy("下一页", "Next")}</button>
            <button data-testid="add-album-page" onClick={addPage} type="button"><Icon name="add" size={14} />{copy("新增页", "Add page")}</button>
            <button disabled={draft.pages.length <= 1} onClick={removeCurrentPage} type="button">{copy("删除本页", "Delete page")}</button>
          </div>
          <div className={styles.stageToolbar}>
            <span>{page.widthMm} × {page.heightMm} mm · {draft.layout} · {draft.perPage} {copy("宫格", "slots")}</span>
            <span>{page.warnings.length ? copy("部分印面已缩放以适应版面", "Some seals were scaled to fit") : status}</span>
          </div>
          <div className={`${styles.paper} ${isHistoricDropTarget ? styles.paperDropTarget : ""}`} data-testid="album-paper">
            {items.length > 0 ? <div dangerouslySetInnerHTML={{ __html: page.svg }} /> : <div className={styles.empty}><span aria-hidden="true">方寸</span><p>{status}</p></div>}
          </div>
          <p aria-live="polite" className={styles.notice}>{status}</p>
        </section>
        <aside className={`paper-panel ${styles.panel}`}>
          <h2>{copy("页面设置", "Page settings")}</h2>
          <p>{copy("题名、题跋与版式应用到全部页面；PNG 与单页 PDF 导出当前页，整册 PDF 固定全部页面。", "Title, colophon, and layout apply to every page. PNG and single-page PDF export the current page; book PDF pins every page.")}</p>
          <div className={styles.field}><label htmlFor="album-title">{copy("题名", "Title")}</label><input id="album-title" maxLength={40} onChange={(event) => updateDraft({ title: event.target.value })} value={draft.title} /></div>
          <div className={styles.field}><label htmlFor="album-colophon">{copy("题跋 / 页脚", "Colophon / footer")}</label><textarea id="album-colophon" maxLength={120} onChange={(event) => updateDraft({ colophon: event.target.value })} value={draft.colophon} /></div>
          <div className={styles.field}><span>{copy("版式", "Layout")}</span><div className={styles.choices}>{(["grid", "ceye", "jingzhe"] as const).map((layout) => <button aria-pressed={draft.layout === layout} key={layout} onClick={() => updateDraft({ layout })} type="button">{layout === "grid" ? copy("现代网格", "Grid") : layout === "ceye" ? copy("册页", "Album") : copy("经折装", "Accordion")}</button>)}</div></div>
          <div className={styles.field}><span>{copy("每页数量", "Per page")}</span><div className={styles.choices}>{([1, 2, 4, 6, 9] as const).map((count) => <button aria-pressed={draft.perPage === count} key={count} onClick={() => setPerPage(count)} type="button">{count}</button>)}</div></div>
          <div className={styles.field}><span>{copy("纸张", "Page size")}</span><div className={styles.choices}><button aria-pressed={draft.pageSize === "a4"} onClick={() => updateDraft({ pageSize: "a4" })} type="button">A4</button><button aria-pressed={draft.pageSize === "a5"} onClick={() => updateDraft({ pageSize: "a5" })} type="button">A5</button></div></div>
          <div className={styles.export}><button disabled={!items.length || busy !== null} onClick={() => void exportPng()} type="button">{busy === "png" ? copy("生成 PNG…", "Generating PNG...") : copy("导出 PNG", "Export PNG")}</button><button disabled={!items.length || busy !== null} onClick={() => void exportPdf()} type="button">{busy === "pdf" ? copy("生成 PDF…", "Generating PDF...") : copy("导出 PDF", "Export PDF")}</button><button disabled={albumItemCount === 0 || busy !== null} onClick={() => void exportBookPdf()} type="button"><Icon name="book" size={14} />{busy === "book-pdf" ? copy("生成整册 PDF…", "Generating book PDF...") : copy("导出整册 PDF", "Export book PDF")}</button></div>
          <section aria-labelledby="cloud-album-heading" className={styles.cloudAlbums}>
            <div><h3 id="cloud-album-heading">{copy("云端印谱", "Cloud albums")}</h3><p>{copy(`最多 ${ALBUM_MAX_PAGES} 页，只保存项目版本引用与受控历史参考。默认仅自己可读；可明确创建只读、可撤销的固定快照链接。`, `Up to ${ALBUM_MAX_PAGES} pages. Only project-version references and canonical historic references are saved. Albums are private by default; you can explicitly create a read-only, revocable pinned-snapshot link.`)}</p></div>
            {cloudAvailability === "unconfigured" ? <p className={styles.cloudState}>{copy("配置公开 Supabase URL 与 publishable key 后可启用私有云端保存。", "Configure the public Supabase URL and publishable key to enable private cloud saves.")}</p> : null}
            {cloudAvailability === "checking" ? <p className={styles.cloudState}>{copy("正在核验账户会话…", "Checking account session…")}</p> : null}
            {cloudAvailability === "signed-out" ? <p className={styles.cloudState}>{copy("登录并同步项目后，才可保存带不可变版本引用的云端印谱。", "Sign in and sync projects before saving a cloud album with immutable version references.")} <Link href="/account">{copy("前往账户", "Open account")}</Link></p> : null}
            {cloudAvailability === "ready" && cloudUser ? <>
              <div className={styles.cloudActions}><button data-testid="save-new-cloud-album" disabled={albumItemCount === 0 || cloudAction !== null} onClick={() => void saveToCloud(true)} type="button"><Icon name="save" size={14} />{cloudAction === "save" ? copy("保存中…", "Saving…") : copy("另存云端", "Save new")}</button>{activeCloudAlbumId ? <button disabled={albumItemCount === 0 || cloudAction !== null} onClick={() => void saveToCloud(false)} type="button"><Icon name="refresh" size={14} />{copy("更新当前", "Update current")}</button> : null}{activeCloudAlbumId ? <button data-testid="create-cloud-album-share" disabled={cloudAction !== null} onClick={() => void createOrRefreshCloudShare()} type="button"><Icon name="send" size={14} />{cloudAction === "share" ? copy("创建中…", "Creating…") : activeCloudShare ? copy("刷新链接", "Refresh link") : copy("创建链接", "Create link")}</button> : null}</div>
              {activeCloudShare ? <div className={styles.shareLink}><label htmlFor="cloud-album-share-url">{copy("只读分享链接", "Read-only share link")}</label><input data-testid="cloud-album-share-url" id="cloud-album-share-url" readOnly value={activeCloudShareUrl} /><div><button onClick={() => void copyCloudShareUrl(activeCloudShareUrl)} type="button"><Icon name="copy" size={14} />{copy("复制链接", "Copy link")}</button><button disabled={cloudAction !== null} onClick={() => void revokeCloudShare()} type="button"><Icon name="lock" size={14} />{cloudAction === "revoke-share" ? copy("撤销中…", "Revoking…") : copy("撤销链接", "Revoke link")}</button></div><p>{copy("链接仅展示创建时冻结的项目快照；更新云端印谱后请刷新链接。历史印教学参考不会被分享。", "The link shows only project snapshots frozen at creation. Refresh it after updating the cloud album. Historic teaching references are never shared.")}</p></div> : activeCloudAlbumId ? <p className={styles.cloudState}>{copy("当前云端印谱仍仅自己可读；创建链接前会再次确认，并固定现有云端版本。", "The current cloud album remains private. Creating a link asks for confirmation and pins the saved cloud version.")}</p> : null}
              {cloudAlbums.length ? <div className={styles.cloudAlbumList}>{cloudAlbums.map((album) => <article className={album.id === activeCloudAlbumId ? styles.cloudAlbumActive : ""} key={album.id}><button aria-pressed={album.id === activeCloudAlbumId} data-testid="load-cloud-album" onClick={() => loadCloudAlbum(album)} type="button"><strong>{album.title}</strong><small>{album.items.length} / {album.pageCount * album.perPage} · {copy(`${album.pageCount} 页`, `${album.pageCount} pages`)} · {album.layout}</small></button><button aria-label={copy(`删除云端印谱${album.title}`, `Delete cloud album ${album.title}`)} disabled={cloudAction !== null} onClick={() => void removeCloudAlbum(album)} type="button">{copy("删除", "Delete")}</button></article>)}</div> : <p className={styles.cloudState}>{copy("还没有云端印谱。保存后仅当前账户可恢复。", "No cloud albums yet. Saved albums are restorable only by this account.")}</p>}
            </> : null}
            {cloudStatus ? <p aria-live="polite" className={styles.cloudState}>{cloudStatus}</p> : null}
          </section>
        </aside>
      </div>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
