import {
  getInscriptionFaces,
  type InscriptionScript,
  type InscriptionSide,
  type SealDsl,
} from "@fangcun/dsl-schema";

export const inscriptionSideOrder: readonly InscriptionSide[] = ["front", "right", "back", "left"];

export const inscriptionSideLabels: Record<InscriptionSide, { en: string; zh: string }> = {
  front: { zh: "正面", en: "Front" },
  right: { zh: "右侧", en: "Right" },
  back: { zh: "背面", en: "Back" },
  left: { zh: "左侧", en: "Left" },
};

export const inscriptionScriptLabels: Record<InscriptionScript, { en: string; zh: string }> = {
  kai: { zh: "楷书", en: "Regular script" },
  xingshu: { zh: "行书", en: "Running script" },
  lishu: { zh: "隶书", en: "Clerical script" },
};

const svgFontFamilies: Record<InscriptionScript, string> = {
  kai: "'Noto Serif SC Variable','Source Han Serif SC',serif",
  xingshu: "'Noto Serif SC Variable','STKaiti','KaiTi',serif",
  lishu: "'Noto Serif SC Variable','LiSu','Source Han Serif SC',serif",
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createInscriptionTemplate({
  date,
  name,
  place,
}: {
  date: string;
  name: string;
  place: string;
}): string {
  const parts = [date.trim(), name.trim() ? `${name.trim()}刻` : "", place.trim() ? `于${place.trim()}` : ""];
  return Array.from(parts.filter(Boolean).join("")).slice(0, 32).join("");
}

export function getActiveInscriptionFaces(dsl: SealDsl) {
  if (!dsl.inscription.enabled) return [];
  return getInscriptionFaces(dsl.inscription)
    .filter((face) => face.text.trim())
    .sort((left, right) => inscriptionSideOrder.indexOf(left.side) - inscriptionSideOrder.indexOf(right.side));
}

function renderVerticalText(text: string, panelWidth: number): string {
  const characters = Array.from(text).slice(0, 32);
  const rowLimit = 10;
  const columns = Math.max(1, Math.ceil(characters.length / rowLimit));
  const columnGap = 62;
  const firstX = panelWidth / 2 + (columns - 1) * columnGap / 2;
  return characters.map((character, index) => {
    const column = Math.floor(index / rowLimit);
    const row = index % rowLimit;
    const x = firstX - column * columnGap;
    const y = 124 + row * 50;
    return `<text x="${x}" y="${y}" text-anchor="middle">${escapeXml(character)}</text>`;
  }).join("");
}

export function createInscriptionRubbingSvg(dsl: SealDsl): string {
  const faces = getActiveInscriptionFaces(dsl);
  if (faces.length === 0) throw new Error("INSCRIPTION_REQUIRED");
  const panelWidths = faces.map((face) => Math.max(220, Math.ceil(Array.from(face.text).length / 10) * 62 + 96));
  const gap = 24;
  const padding = 36;
  const width = panelWidths.reduce((sum, panelWidth) => sum + panelWidth, 0) + gap * (faces.length - 1) + padding * 2;
  const height = 720;
  let offsetX = padding;
  const panels = faces.map((face, index) => {
    const panelWidth = panelWidths[index] ?? 220;
    const label = inscriptionSideLabels[face.side].zh;
    const panel = `<g data-inscription-side="${face.side}" transform="translate(${offsetX} 36)"><rect width="${panelWidth}" height="648" rx="4" fill="#11100e" stroke="#f3eadb" stroke-width="2"/><text x="${panelWidth / 2}" y="50" fill="#f3eadb" font-family="'Noto Sans SC Variable',sans-serif" font-size="18" text-anchor="middle">${label}边款拓片</text><g fill="#fffdf7" font-family="${svgFontFamilies[dsl.inscription.script]}" font-size="38" font-weight="600">${renderVerticalText(face.text, panelWidth)}</g><text x="${panelWidth / 2}" y="618" fill="#cfc6b8" font-family="'Noto Sans SC Variable',sans-serif" font-size="14" text-anchor="middle">${inscriptionScriptLabels[dsl.inscription.script].zh} · ${dsl.inscription.knife === "double" ? "双刀阴刻" : "单刀阴刻"}</text></g>`;
    offsetX += panelWidth + gap;
    return panel;
  }).join("");
  const title = `${dsl.text}印边款拓片，共${faces.length}面`;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}" data-fangcun-output="inscription-rubbing" data-script="${dsl.inscription.script}" data-knife="${dsl.inscription.knife}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escapeXml(title)}</title><rect width="${width}" height="${height}" fill="#e9dfcf"/>${panels}</svg>`;
}
