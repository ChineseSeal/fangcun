import type { AlbumItem } from "@fangcun/album";
import type { SealDsl } from "@fangcun/dsl-schema";
import { historicSealEntries, type HistoricSealEntry } from "@fangcun/knowledge/historic-seals";
import type { Locale } from "./i18n";

export const HISTORIC_ALBUM_ITEM_PREFIX = "historic:";
export const HISTORIC_ALBUM_DRAG_TYPE = "application/x-fangcun-historic-seal";

export function historicAlbumItemId(slug: string): string {
  return `${HISTORIC_ALBUM_ITEM_PREFIX}${slug}`;
}

export function findAlbumHistoricReference(slug: string | null | undefined): HistoricSealEntry | undefined {
  return typeof slug === "string" ? historicSealEntries.find((entry) => entry.slug === slug) : undefined;
}

export function normalizeHistoricSealSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>(historicSealEntries.map((entry) => entry.slug));
  const unique = new Set<string>();
  for (const slug of value) {
    if (typeof slug === "string" && known.has(slug)) unique.add(slug);
  }
  return [...unique];
}

export function createHistoricAlbumItem(entry: HistoricSealEntry, svg: string, locale: Locale): AlbumItem {
  const source = locale === "en"
    ? `Historic teaching reference · ${entry.institution}`
    : `历史印教学参考 · ${entry.institution}`;
  return {
    caption: entry.shortTitle,
    dsl: entry.dsl as SealDsl,
    id: historicAlbumItemId(entry.slug),
    source,
    svg,
  };
}
