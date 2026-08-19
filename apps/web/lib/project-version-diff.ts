import { getInscriptionFaces, type SealDsl } from "@fangcun/dsl-schema";
import type { SealProjectVersion } from "./project-store";

export type ProjectVersionDifference = {
  path: string;
  group: "版本" | "印面" | "章法" | "字形" | "边框" | "印蜕" | "实体" | "边款";
  label: string;
  before: string;
  after: string;
};

type DifferenceDescriptor = {
  path: string;
  group: ProjectVersionDifference["group"];
  label: string;
  value: (version: SealProjectVersion) => unknown;
  format?: (value: unknown) => string;
};

const scriptLabels: Record<SealDsl["script"], string> = {
  xiaozhuan: "小篆",
  han_seal: "汉印篆",
  guxi: "古玺",
  bird_worm: "鸟虫篆",
  jinwen: "金文",
  jiaguwen: "甲骨文",
};

const styleLabels: Record<string, string> = {
  qin_formal: "秦代小篆",
  han_private: "汉印篆",
  guxi_warring_states: "战国古玺",
  bird_worm: "鸟虫篆",
};

const valueLabels: Record<string, string> = {
  yin: "白文",
  yang: "朱文",
  square: "方印",
  rect: "长方印",
  circle: "圆印",
  ellipse: "椭圆印",
  freeform: "随形印",
  traditional: "传统顺序",
  huiwen: "回文顺序",
  modern: "现代顺序",
  none: "无",
  single: "单框",
  thick: "厚框",
  double: "双框",
  irregular: "不规则框",
  broken: "残框",
  jie: "界格",
  tian: "田字格",
  ri: "日字格",
  vermilion: "朱红",
  cinnabar_deep: "深朱砂",
  vermilion_light: "浅朱红",
  black: "墨色",
  xuan: "宣纸",
  mian: "棉纸",
  qingtian: "青田石",
  shoushan: "寿山石",
  changhua: "昌化石",
  bahrain: "巴林石",
  copper: "铜",
  jade: "玉",
  wood: "木",
  ceramic: "陶",
  other: "其他石料",
  left: "左侧",
  right: "右侧",
  front: "正面",
  back: "背面",
  enabled: "启用",
  disabled: "关闭",
  kai: "楷书",
  xingshu: "行书",
  lishu: "隶书",
};

const layoutLabels: Record<string, string> = {
  single: "单字居中",
  vertical_2: "两字纵排",
  horizontal_2: "两字横排",
  vertical_3: "三字纵排",
  horizontal_3: "三字横排",
  grid_2x2: "四字方格",
  two_col: "双列章法",
  huiwen: "回文章法",
  ring: "环形章法",
  freeform: "自由章法",
};

const decimal = (value: unknown) => Number(value).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
const percent = (value: unknown) => `${decimal(Number(value) * 100)}%`;
const labelValue = (value: unknown) => valueLabels[String(value)] ?? String(value);
const styleValue = (value: unknown) => styleLabels[String(value)] ?? String(value);
const scriptValue = (value: unknown) => scriptLabels[value as SealDsl["script"]] ?? String(value);
const layoutValue = (value: unknown) => layoutLabels[String(value)] ?? String(value);
const inscriptionFacesValue = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value.map((face) => {
    if (!face || typeof face !== "object") return "—";
    const entry = face as { side?: unknown; text?: unknown };
    return `${labelValue(entry.side)}：${String(entry.text ?? "")}`;
  }).join("；");
};

const descriptors: readonly DifferenceDescriptor[] = [
  { path: "engineVersion", group: "版本", label: "引擎版本", value: (version) => version.engineVersion },
  { path: "assetVersion", group: "版本", label: "字形资产", value: (version) => version.assetVersion },
  { path: "version", group: "版本", label: "DSL 版本", value: (version) => version.dsl.version },
  { path: "text", group: "印面", label: "印文", value: (version) => version.dsl.text },
  { path: "mode", group: "印面", label: "印式", value: (version) => version.dsl.mode, format: labelValue },
  { path: "style", group: "印面", label: "风格", value: (version) => version.dsl.style, format: styleValue },
  { path: "script", group: "印面", label: "书体", value: (version) => version.dsl.script, format: scriptValue },
  { path: "shape.type", group: "印面", label: "印面形状", value: (version) => version.dsl.shape.type, format: labelValue },
  { path: "shape.ratio", group: "印面", label: "宽高比", value: (version) => version.dsl.shape.ratio, format: decimal },
  { path: "layout.strategy", group: "章法", label: "布局策略", value: (version) => version.dsl.layout.strategy, format: layoutValue },
  { path: "layout.readingOrder", group: "章法", label: "阅读顺序", value: (version) => version.dsl.layout.readingOrder, format: labelValue },
  { path: "layout.density", group: "章法", label: "布局密度", value: (version) => version.dsl.layout.density, format: percent },
  { path: "border.type", group: "边框", label: "边框类型", value: (version) => version.dsl.border.type, format: labelValue },
  { path: "border.width", group: "边框", label: "边框宽度", value: (version) => version.dsl.border.width, format: percent },
  { path: "border.distress", group: "边框", label: "边框残损", value: (version) => version.dsl.border.distress, format: percent },
  { path: "border.corner", group: "边框", label: "边角圆度", value: (version) => version.dsl.border.corner, format: percent },
  { path: "grid.type", group: "章法", label: "界格类型", value: (version) => version.dsl.grid.type, format: labelValue },
  { path: "grid.width", group: "章法", label: "界格宽度", value: (version) => version.dsl.grid.width, format: percent },
  { path: "impression.distress", group: "印蜕", label: "印面残损", value: (version) => version.dsl.impression.distress, format: percent },
  { path: "impression.inkUneven", group: "印蜕", label: "印泥不匀", value: (version) => version.dsl.impression.inkUneven, format: percent },
  { path: "impression.bleed", group: "印蜕", label: "洇化", value: (version) => version.dsl.impression.bleed, format: percent },
  { path: "impression.seed", group: "印蜕", label: "盖印种子", value: (version) => version.dsl.impression.seed },
  { path: "paste.color", group: "印蜕", label: "印泥颜色", value: (version) => version.dsl.paste.color, format: labelValue },
  { path: "paste.opacity", group: "印蜕", label: "印泥浓度", value: (version) => version.dsl.paste.opacity, format: percent },
  { path: "paper.color", group: "印蜕", label: "纸张", value: (version) => version.dsl.paper.color, format: labelValue },
  { path: "paper.texture", group: "印蜕", label: "纸张纹理", value: (version) => version.dsl.paper.texture, format: percent },
  { path: "physical.sizeMm", group: "实体", label: "实体尺寸", value: (version) => version.dsl.physical.sizeMm, format: (value) => `${decimal(value)} mm` },
  { path: "physical.material", group: "实体", label: "印石", value: (version) => version.dsl.physical.material, format: labelValue },
  { path: "inscription.enabled", group: "边款", label: "边款", value: (version) => version.dsl.inscription.enabled, format: (value) => labelValue(value ? "enabled" : "disabled") },
  { path: "inscription.faces", group: "边款", label: "边款面", value: (version) => getInscriptionFaces(version.dsl.inscription), format: inscriptionFacesValue },
  { path: "inscription.script", group: "边款", label: "边款书体", value: (version) => version.dsl.inscription.script, format: labelValue },
  { path: "inscription.knife", group: "边款", label: "边款刀法", value: (version) => version.dsl.inscription.knife, format: (value) => value === "single" ? "单刀" : "双刀" },
  { path: "meta.sourceSealId", group: "版本", label: "来源印章", value: (version) => version.dsl.meta.sourceSealId ?? "—" },
  { path: "meta.remixOf", group: "版本", label: "Remix 来源", value: (version) => version.dsl.meta.remixOf ?? "—" },
  { path: "meta.exerciseId", group: "版本", label: "课程练习", value: (version) => version.dsl.meta.exerciseId ?? "—" },
];

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatGlyph(glyph: SealDsl["glyphs"][number] | undefined): string {
  if (!glyph) return "—";
  const adjustments = [
    glyph.locked ? "锁定" : null,
    glyph.scaleX !== 1 || glyph.scaleY !== 1 ? `缩放 ${decimal(glyph.scaleX)}×${decimal(glyph.scaleY)}` : null,
    glyph.dx !== 0 || glyph.dy !== 0 ? `位移 ${decimal(glyph.dx)}, ${decimal(glyph.dy)}` : null,
    glyph.rotate !== 0 ? `旋转 ${decimal(glyph.rotate)}°` : null,
  ].filter(Boolean);
  return `${glyph.variantId}${adjustments.length > 0 ? ` · ${adjustments.join(" · ")}` : ""}`;
}

export function compareProjectVersions(
  beforeVersion: SealProjectVersion,
  afterVersion: SealProjectVersion,
): ProjectVersionDifference[] {
  const differences: ProjectVersionDifference[] = [];
  for (const descriptor of descriptors) {
    const before = descriptor.value(beforeVersion);
    const after = descriptor.value(afterVersion);
    if (valuesMatch(before, after)) continue;
    const format = descriptor.format ?? ((value: unknown) => String(value));
    differences.push({
      path: descriptor.path,
      group: descriptor.group,
      label: descriptor.label,
      before: format(before),
      after: format(after),
    });
  }

  const glyphCount = Math.max(beforeVersion.dsl.glyphs.length, afterVersion.dsl.glyphs.length);
  for (let index = 0; index < glyphCount; index += 1) {
    const beforeGlyph = beforeVersion.dsl.glyphs[index];
    const afterGlyph = afterVersion.dsl.glyphs[index];
    if (valuesMatch(beforeGlyph, afterGlyph)) continue;
    differences.push({
      path: `glyphs[${index}]`,
      group: "字形",
      label: `字形「${afterGlyph?.char ?? beforeGlyph?.char ?? index + 1}」`,
      before: formatGlyph(beforeGlyph),
      after: formatGlyph(afterGlyph),
    });
  }
  return differences;
}
