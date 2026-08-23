import type { ExplainFacts } from "./index";

export type ExplainLocale = "zh-Hans" | "en";

export type ExplainPresentation = {
  locale: ExplainLocale;
  mode: string;
  script: string;
  composition: string;
  summary: string;
};

const scriptLabels = {
  "zh-Hans": {
    xiaozhuan: "小篆",
    han_seal: "汉印篆",
    guxi: "古玺",
    bird_worm: "鸟虫篆",
    jinwen: "金文",
    jiaguwen: "甲骨文",
  },
  en: {
    xiaozhuan: "Small Seal Script",
    han_seal: "Han seal script",
    guxi: "Guxi script",
    bird_worm: "Bird-and-worm script",
    jinwen: "Bronze script",
    jiaguwen: "Oracle bone script",
  },
} as const;

const layoutLabels: Record<ExplainLocale, Record<string, string>> = {
  "zh-Hans": {
    freeform: "自由章法",
    grid_2x2: "四字方格",
    guxi_3: "古玺三字",
    horizontal_2: "两字横排",
    horizontal_3: "三字横排",
    huiwen: "回文章法",
    ring: "环形章法",
    single: "单字居中",
    two_col: "双列章法",
    vertical_2: "两字纵排",
    vertical_3: "三字纵排",
  },
  en: {
    freeform: "free composition (zhangfa)",
    grid_2x2: "four-character grid composition (zhangfa)",
    guxi_3: "three-character Guxi composition (zhangfa)",
    horizontal_2: "two-character horizontal composition (zhangfa)",
    horizontal_3: "three-character horizontal composition (zhangfa)",
    huiwen: "huiwen reading composition (zhangfa)",
    ring: "ring composition (zhangfa)",
    single: "centered single-character composition (zhangfa)",
    two_col: "two-column composition (zhangfa)",
    vertical_2: "two-character vertical composition (zhangfa)",
    vertical_3: "three-character vertical composition (zhangfa)",
  },
};

export function explainFactFingerprint(facts: ExplainFacts): string {
  return JSON.stringify({
    annotations: facts.annotations,
    borderType: facts.borderType,
    charCount: facts.charCount,
    densityBand: facts.densityBand,
    distressBand: facts.distressBand,
    glyphSources: facts.glyphSources,
    layoutStrategy: facts.layoutStrategy,
    mode: facts.mode,
    readingOrder: facts.readingOrder,
    style: facts.style,
  });
}

export function formatExplainFacts(
  facts: ExplainFacts,
  locale: ExplainLocale,
): ExplainPresentation {
  const script = facts.glyphSources[0]?.script ?? "han_seal";
  const scriptLabel = scriptLabels[locale][script];
  const layout = layoutLabels[locale][facts.layoutStrategy]
    ?? (locale === "en" ? "custom composition (zhangfa)" : "自定义章法");
  const mode = locale === "en"
    ? facts.mode === "yin" ? "Baiwen (intaglio seal)" : "Zhuwen (relief seal)"
    : facts.mode === "yin" ? "白文" : "朱文";
  const summary = locale === "en"
    ? `${mode} uses ${layout}. Distress and ink variation affect only the seal impression, not the glyph source or geometry.`
    : `${mode}印面采用${layout}，残损与印泥只影响印蜕，不改变字形来源或几何。`;
  return { locale, mode, script: scriptLabel, composition: layout, summary };
}
