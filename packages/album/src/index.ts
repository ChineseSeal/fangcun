import type { SealDsl } from "@fangcun/dsl-schema";

export const ALBUM_PAGE_SIZES = {
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
} as const;

export const ALBUM_PER_PAGE = [1, 2, 4, 6, 9] as const;

export type AlbumPageSize = keyof typeof ALBUM_PAGE_SIZES;
export type AlbumLayout = "ceye" | "jingzhe" | "grid";
export type AlbumPerPage = (typeof ALBUM_PER_PAGE)[number];

export type AlbumItem = {
  id: string;
  dsl: SealDsl;
  svg: string;
  caption?: string;
  source?: string;
};

export type AlbumSlot = {
  index: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  scale: number;
};

export type AlbumPageOptions = {
  title: string;
  colophon?: string;
  pageSize?: AlbumPageSize;
  layout?: AlbumLayout;
  perPage?: AlbumPerPage;
  pageNumber?: number;
  locale?: "zh-Hans" | "en";
};

export type AlbumPage = {
  widthMm: number;
  heightMm: number;
  pageSize: AlbumPageSize;
  layout: AlbumLayout;
  perPage: AlbumPerPage;
  slots: AlbumSlot[];
  svg: string;
  warnings: string[];
};

const PRINT_UNITS_PER_MM = 100;
const PAGE_MARGIN_MM = 16;
const TITLE_HEIGHT_MM = 25;
const FOOTER_HEIGHT_MM = 16;
const SLOT_GAP_MM = 7;

function formatMeasure(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractVisualContent(svg: string): string {
  const openEnd = svg.indexOf(">");
  const closeStart = svg.lastIndexOf("</svg>");
  if (!svg.trimStart().startsWith("<svg") || openEnd < 0 || closeStart <= openEnd) {
    throw new Error("ALBUM_SOURCE_INVALID");
  }
  return svg
    .slice(openEnd + 1, closeStart)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/gi, "");
}

function gridFor(perPage: AlbumPerPage): { columns: number; rows: number } {
  switch (perPage) {
    case 1: return { columns: 1, rows: 1 };
    case 2: return { columns: 2, rows: 1 };
    case 4: return { columns: 2, rows: 2 };
    case 6: return { columns: 3, rows: 2 };
    case 9: return { columns: 3, rows: 3 };
  }
}

export function deriveAlbumSlots(
  pageSize: AlbumPageSize = "a4",
  perPage: AlbumPerPage = 4,
  items: readonly AlbumItem[] = [],
): { slots: AlbumSlot[]; warnings: string[] } {
  const page = ALBUM_PAGE_SIZES[pageSize];
  const { columns, rows } = gridFor(perPage);
  const contentWidthMm = page.widthMm - PAGE_MARGIN_MM * 2;
  const contentHeightMm = page.heightMm - PAGE_MARGIN_MM * 2 - TITLE_HEIGHT_MM - FOOTER_HEIGHT_MM;
  const slotWidthMm = (contentWidthMm - SLOT_GAP_MM * (columns - 1)) / columns;
  const slotHeightMm = (contentHeightMm - SLOT_GAP_MM * (rows - 1)) / rows;
  const slots = Array.from({ length: perPage }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const item = items[index];
    const width = item?.dsl.shape.type === "circle" ? item.dsl.physical.sizeMm : item?.dsl.physical.sizeMm ?? 25;
    const ratio = item?.dsl.shape.type === "circle" ? 1 : item?.dsl.shape.ratio ?? 1;
    const height = width / ratio;
    const availableWidth = slotWidthMm * 0.72;
    const availableHeight = slotHeightMm * 0.58;
    const scale = Math.min(1, availableWidth / width, availableHeight / height);
    return {
      index,
      xMm: PAGE_MARGIN_MM + column * (slotWidthMm + SLOT_GAP_MM),
      yMm: PAGE_MARGIN_MM + TITLE_HEIGHT_MM + row * (slotHeightMm + SLOT_GAP_MM),
      widthMm: slotWidthMm,
      heightMm: slotHeightMm,
      contentWidthMm: width * scale,
      contentHeightMm: height * scale,
      scale,
    } satisfies AlbumSlot;
  });
  const warnings = items.some((item, index) => (slots[index]?.scale ?? 1) < 1)
    ? ["ALBUM_ITEM_SCALED_TO_SLOT"]
    : [];
  if (items.length > perPage) warnings.push("ALBUM_ITEMS_TRUNCATED_TO_PAGE");
  return { slots, warnings };
}

function createSlotSvg(item: AlbumItem, slot: AlbumSlot, locale: "zh-Hans" | "en"): string {
  const visual = extractVisualContent(item.svg);
  const x = (slot.xMm + (slot.widthMm - slot.contentWidthMm) / 2) * PRINT_UNITS_PER_MM;
  const y = (slot.yMm + slot.heightMm * 0.16 + (slot.heightMm * 0.48 - slot.contentHeightMm) / 2) * PRINT_UNITS_PER_MM;
  const caption = item.caption || item.dsl.text;
  const size = `${item.dsl.physical.sizeMm} ${locale === "en" ? "mm seal" : "mm 印"}`;
  const source = item.source ? ` · ${item.source}` : "";
  const centerX = (slot.xMm + slot.widthMm / 2) * PRINT_UNITS_PER_MM;
  const captionY = (slot.yMm + slot.heightMm * 0.77) * PRINT_UNITS_PER_MM;
  const sourceY = (slot.yMm + slot.heightMm * 0.84) * PRINT_UNITS_PER_MM;
  return `<g data-album-slot="${slot.index}" data-size-mm="${formatMeasure(item.dsl.physical.sizeMm)}"><rect x="${formatMeasure(slot.xMm * PRINT_UNITS_PER_MM)}" y="${formatMeasure(slot.yMm * PRINT_UNITS_PER_MM)}" width="${formatMeasure(slot.widthMm * PRINT_UNITS_PER_MM)}" height="${formatMeasure(slot.heightMm * PRINT_UNITS_PER_MM)}" fill="none" stroke="#D9CBB5" stroke-width="${formatMeasure(0.25 * PRINT_UNITS_PER_MM)}"/><g transform="translate(${formatMeasure(x)} ${formatMeasure(y)}) scale(${formatMeasure(slot.contentWidthMm * PRINT_UNITS_PER_MM / 1000)} ${formatMeasure(slot.contentHeightMm * PRINT_UNITS_PER_MM / 1000)})">${visual}</g><text x="${formatMeasure(centerX)}" y="${formatMeasure(captionY)}" fill="#332B24" font-family="serif" font-size="${formatMeasure(3.4 * PRINT_UNITS_PER_MM)}" text-anchor="middle">${escapeXml(caption)}</text><text x="${formatMeasure(centerX)}" y="${formatMeasure(sourceY)}" fill="#877665" font-family="sans-serif" font-size="${formatMeasure(2.2 * PRINT_UNITS_PER_MM)}" text-anchor="middle">${escapeXml(size + source)}</text></g>`;
}

export function createAlbumPage(items: readonly AlbumItem[], options: AlbumPageOptions): AlbumPage {
  const pageSize = options.pageSize ?? "a4";
  const layout = options.layout ?? "grid";
  const perPage = options.perPage ?? 4;
  const locale = options.locale ?? "zh-Hans";
  const page = ALBUM_PAGE_SIZES[pageSize];
  const derived = deriveAlbumSlots(pageSize, perPage, items);
  const title = options.title || (locale === "en" ? "Fangcun Album" : "方寸印谱");
  const colophon = options.colophon || (locale === "en" ? "Fangcun · Seal DSL derived page" : "方寸 Fangcun · 由 Seal DSL 派生");
  const folds = layout === "jingzhe"
    ? Array.from({ length: 3 }, (_, index) => {
      const x = PAGE_MARGIN_MM + (page.widthMm - PAGE_MARGIN_MM * 2) * (index + 1) / 4;
      return `<path d="M${formatMeasure(x * PRINT_UNITS_PER_MM)} ${formatMeasure(PAGE_MARGIN_MM * PRINT_UNITS_PER_MM)}V${formatMeasure((page.heightMm - PAGE_MARGIN_MM) * PRINT_UNITS_PER_MM)}" stroke="#C9B79E" stroke-width="0.8" stroke-dasharray="12 8"/>`;
    }).join("")
    : "";
  const slotMarkup = items.slice(0, perPage).map((item, index) => createSlotSvg(item, derived.slots[index]!, locale)).join("");
  const pageNumber = options.pageNumber ?? 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${page.widthMm}mm" height="${page.heightMm}mm" viewBox="0 0 ${page.widthMm * PRINT_UNITS_PER_MM} ${page.heightMm * PRINT_UNITS_PER_MM}" role="img" aria-labelledby="fangcun-album-page-title fangcun-album-page-desc" data-fangcun-output="album-page" data-album-layout="${layout}" data-album-page="${pageNumber}"><title id="fangcun-album-page-title">${escapeXml(title)}</title><desc id="fangcun-album-page-desc">${escapeXml(locale === "en" ? "Printable seal album page with source-derived SVG impressions" : "可打印的印谱页面，印面来自权威 Seal Engine SVG")}</desc><rect width="100%" height="100%" fill="#FBF8F1"/><text x="${page.widthMm * PRINT_UNITS_PER_MM / 2}" y="${PAGE_MARGIN_MM * PRINT_UNITS_PER_MM + 10 * PRINT_UNITS_PER_MM}" fill="#332B24" font-family="serif" font-size="${pageSize === "a4" ? 820 : 620}" text-anchor="middle">${escapeXml(title)}</text>${folds}${slotMarkup}<text x="${PAGE_MARGIN_MM * PRINT_UNITS_PER_MM}" y="${(page.heightMm - PAGE_MARGIN_MM) * PRINT_UNITS_PER_MM}" fill="#877665" font-family="sans-serif" font-size="240">${escapeXml(colophon)}</text><text x="${(page.widthMm - PAGE_MARGIN_MM) * PRINT_UNITS_PER_MM}" y="${(page.heightMm - PAGE_MARGIN_MM) * PRINT_UNITS_PER_MM}" fill="#877665" font-family="sans-serif" font-size="240" text-anchor="end">${escapeXml(locale === "en" ? `Page ${pageNumber}` : `第 ${pageNumber} 页`)}</text></svg>`;
  return {
    widthMm: page.widthMm,
    heightMm: page.heightMm,
    pageSize,
    layout,
    perPage,
    slots: derived.slots,
    svg,
    warnings: derived.warnings,
  };
}
