import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import type { AlbumLayout, AlbumPageSize, AlbumPerPage } from "@fangcun/album";

const ALBUM_PER_PAGE_VALUES = [1, 2, 4, 6, 9] as const;
export const ALBUM_SHARE_MAX_PAGES = 24;

export type AlbumShareItem = {
  caption: string | null;
  dsl: SealDsl;
  page: number;
  slot: number;
};

export type AlbumShare = {
  colophon: string;
  items: AlbumShareItem[];
  layout: AlbumLayout;
  pageCount: number;
  pageSize: AlbumPageSize;
  perPage: AlbumPerPage;
  title: string;
};

type AlbumShareRow = {
  album_share_items: unknown;
  colophon: unknown;
  layout: unknown;
  page_count: unknown;
  page_size: unknown;
  per_page: unknown;
  title: unknown;
};

type AlbumShareItemRow = {
  caption: unknown;
  dsl: unknown;
  page: unknown;
  slot: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isPage(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= ALBUM_SHARE_MAX_PAGES;
}

function isSlot(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 9;
}

function stringValue(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

function parseAlbumShareItem(value: unknown): AlbumShareItem | null {
  if (!isRecord(value)) return null;
  const row = value as AlbumShareItemRow;
  const normalized = normalizeSealDsl(row.dsl);
  const page = isPage(row.page) ? row.page : null;
  const slot = isSlot(row.slot) ? row.slot : null;
  const caption = row.caption === null || row.caption === undefined ? null : stringValue(row.caption, 80);
  if (!normalized.ok || !page || !slot || (row.caption !== null && row.caption !== undefined && caption === null)) return null;
  return { caption, dsl: normalized.value, page, slot };
}

export function parseAlbumShare(value: unknown): AlbumShare | null {
  if (!isRecord(value)) return null;
  const row = value as AlbumShareRow;
  const title = stringValue(row.title, 40);
  const colophon = typeof row.colophon === "string" && row.colophon.length <= 120 ? row.colophon : null;
  const pageCount = isPage(row.page_count) ? row.page_count : null;
  const perPage = isAlbumPerPage(row.per_page) ? row.per_page : null;
  const sourceItems = Array.isArray(row.album_share_items) ? row.album_share_items : [];
  const items = sourceItems
    .map(parseAlbumShareItem)
    .filter((item): item is AlbumShareItem => item !== null)
    .sort((left, right) => left.page - right.page || left.slot - right.slot);
  const slots = new Set(items.map((item) => `${item.page}:${item.slot}`));
  if (
    !title
    || colophon === null
    || !isAlbumLayout(row.layout)
    || !isAlbumPageSize(row.page_size)
    || !pageCount
    || !perPage
    || items.length === 0
    || items.length !== sourceItems.length
    || items.length > pageCount * perPage
    || slots.size !== items.length
    || items.some((item) => item.page > pageCount || item.slot > perPage)
  ) return null;
  return {
    colophon,
    items,
    layout: row.layout,
    pageCount,
    pageSize: row.page_size,
    perPage,
    title,
  };
}

export function parsePublicAlbumShare(value: unknown): AlbumShare | null {
  if (!isRecord(value)) return null;
  return parseAlbumShare({
    album_share_items: value.items,
    colophon: value.colophon,
    layout: value.layout,
    page_count: value.pageCount,
    page_size: value.pageSize,
    per_page: value.perPage,
    title: value.title,
  });
}
