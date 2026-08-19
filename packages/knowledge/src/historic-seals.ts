export type HistoricSealSource = {
  title: string;
  institution: string;
  url: string;
  accessedAt: string;
  license: string;
  usageLimits: string;
};

export type HistoricSealDsl = {
  text: string;
  mode: "yin" | "yang";
  style: string;
  script: "han_seal" | "guxi" | "xiaozhuan" | "bird_worm";
  shape: { type: "square" | "rect" | "circle"; ratio: number };
  layout: {
    strategy: string;
    density: number;
    readingOrder: "traditional" | "huiwen" | "modern";
  };
  border: {
    type: "single" | "thick" | "irregular";
    width: number;
    distress: number;
    corner: number;
  };
  grid: { type: "none" | "jie" | "tian" | "ri"; width: number };
  impression: {
    distress: number;
    inkUneven: number;
    bleed: number;
    seed: number;
  };
  physical: { sizeMm: number; material: "copper" | "jade" | "other" | "qingtian" };
};

export type HistoricSealModel3d = {
  dimensionsMm: { width: number; depth: number; height: number };
  knobVariant: "plain" | "rounded" | "arched";
};

export type HistoricSealEntry = {
  slug: string;
  title: string;
  shortTitle: string;
  romanizedTitle: string;
  artifactNumber: string;
  era: "战国" | "汉";
  period: string;
  type: string;
  material: string;
  knob: string;
  dimensions: string;
  institution: string;
  inscription: string;
  script: string;
  mode: string;
  reading: string;
  summary: string;
  history: readonly string[];
  analysis: readonly { title: string; body: string; termSlug: string }[];
  relatedTermSlugs: readonly string[];
  relatedLessonSlugs: readonly string[];
  practiceText: string;
  source: HistoricSealSource;
  reconstructionNotice: string;
  model3d: HistoricSealModel3d;
  dsl: HistoricSealDsl;
};

export const historicSealEntries = [
  {
    slug: "ying-qu",
    title: "白玉羊钮“应衢”印",
    shortTitle: "“应衢”玉印",
    romanizedTitle: "Ying Qu Jade Seal",
    artifactNumber: "故00001079",
    era: "汉",
    period: "汉代",
    type: "私印",
    material: "白玉",
    knob: "羊钮",
    dimensions: "印面 1.4 × 1.4 厘米，通高 2.0 厘米",
    institution: "故宫博物院",
    inscription: "应衢",
    script: "汉篆",
    mode: "白文",
    reading: "右起横读",
    summary: "两字白文汉代私印，方形印面安排紧凑匀称，以白玉琢成羊钮。",
    history: [
      "故宫博物院将此印定为汉代私印。印面刻“应衢”二字，使用汉篆白文，按传统方式从右向左横读。",
      "原器以白玉琢造，印面方正，上立羊钮。藏品页面强调印文满格而位置匀称，并记录羊钮与玉质特征。",
    ],
    analysis: [
      { title: "右起横读", body: "第一字位于右侧，第二字位于左侧；阅读顺序和现代横排相反。", termSlug: "zhangfa" },
      { title: "白文满格", body: "凹刻文字在印蜕中留白，两字充分占据方形印面，同时保持彼此均衡。", termSlug: "baiwen" },
      { title: "方整边界", body: "方形边界稳定整体重心，让两字横排仍保持紧凑而清楚的外轮廓。", termSlug: "yinbian" },
    ],
    relatedTermSlugs: ["han-seal", "baiwen", "zhangfa", "yinbian"],
    relatedLessonSlugs: ["zhu-bai", "zhangfa"],
    practiceText: "方寸",
    source: {
      title: "白玉羊钮“应衢”印",
      institution: "故宫博物院",
      url: "https://www.dpm.org.cn/collection/seal/229623.html",
      accessedAt: "2026-08-11",
      license: "仅引用公开藏品著录，未转载藏品图片",
      usageLimits: "教学复原可用于站内讲解；文物图片须前往原藏品页查看与申请授权",
    },
    reconstructionNotice: "页面印蜕由方寸根据公开著录与 Seal DSL 生成，用于结构教学，不是文物原图，也不用于真伪鉴定。",
    model3d: {
      dimensionsMm: { width: 14, depth: 14, height: 20 },
      knobVariant: "rounded",
    },
    dsl: {
      text: "应衢",
      mode: "yin",
      style: "han_private",
      script: "han_seal",
      shape: { type: "square", ratio: 1 },
      layout: { strategy: "horizontal_2", density: 0.84, readingOrder: "traditional" },
      border: { type: "single", width: 0.045, distress: 0, corner: 0.012 },
      grid: { type: "none", width: 0.018 },
      impression: { distress: 0.08, inkUneven: 0.08, bleed: 0.006, seed: 2061079 },
      physical: { sizeMm: 14, material: "jade" },
    },
  },
  {
    slug: "da-fu-xi",
    title: "楚国铜柱钮“大府”鉨",
    shortTitle: "“大府”楚鉨",
    romanizedTitle: "Da Fu Bronze Xi",
    artifactNumber: "新00026253",
    era: "战国",
    period: "战国·楚",
    type: "官鉨",
    material: "铜",
    knob: "柱钮",
    dimensions: "印面 5.4 × 6.1 厘米，通高 11.7 厘米",
    institution: "故宫博物院",
    inscription: "大府",
    script: "战国古文",
    mode: "白文",
    reading: "左起横读",
    summary: "两字白文战国楚国官鉨，以左起横读和中间竖栏组织宽大的长方形印面。",
    history: [
      "故宫博物院将此器定为战国时期楚国官鉨。器物以铜铸造柱钮，印面两字使用战国古文白文。",
      "公开著录记录了阴线边栏与分隔左右两字的中间竖栏。方寸页面只抽取左起横读、宽印面和白文等结构，不代替原始钤本。",
    ],
    analysis: [
      { title: "左起横读", body: "公开著录明确释为左起横读；教学复原据此将首字置于左侧。", termSlug: "zhangfa" },
      { title: "中竖界栏", body: "原印以一道竖栏区分左右两字；生成图不复制原栏线，仅在文字说明中保留这一事实。", termSlug: "jiege" },
      { title: "白文宽笔", body: "凹刻文字在印蜕中呈白色，宽大笔道让两字在大印面中仍保持充盈。", termSlug: "baiwen" },
    ],
    relatedTermSlugs: ["guxi", "baiwen", "jiege", "zhangfa"],
    relatedLessonSlugs: ["reading-order", "zhu-bai", "zhangfa"],
    practiceText: "清风",
    source: {
      title: "楚国铜柱钮“大府”鉨",
      institution: "故宫博物院",
      url: "https://www.dpm.org.cn/collection/seal/228909.html",
      accessedAt: "2026-08-12",
      license: "仅引用公开藏品著录，未转载藏品图片",
      usageLimits: "教学复原可用于站内讲解；文物图片须前往原藏品页查看与申请授权",
    },
    reconstructionNotice: "页面印蜕由方寸根据公开著录与 Seal DSL 生成，用于古玺读序与宽印面章法教学，不是文物原图，也不用于真伪鉴定。",
    model3d: {
      dimensionsMm: { width: 54, depth: 61, height: 117 },
      knobVariant: "plain",
    },
    dsl: {
      text: "大府",
      mode: "yin",
      style: "guxi_warring_states",
      script: "guxi",
      shape: { type: "rect", ratio: 54 / 61 },
      layout: { strategy: "horizontal_2", density: 0.74, readingOrder: "modern" },
      border: { type: "single", width: 0.035, distress: 0.03, corner: 0.01 },
      grid: { type: "none", width: 0.018 },
      impression: { distress: 0.12, inkUneven: 0.1, bleed: 0.006, seed: 26253 },
      physical: { sizeMm: 61, material: "copper" },
    },
  },
  {
    slug: "xin-cheng-jia",
    title: "白玉鼻钮“新成甲”印",
    shortTitle: "“新成甲”玉印",
    romanizedTitle: "Xin Cheng Jia Jade Seal",
    artifactNumber: "新00100005",
    era: "汉",
    period: "汉代",
    type: "私印",
    material: "白玉",
    knob: "鼻钮",
    dimensions: "印面 2.3 × 2.3 厘米，通高 1.9 厘米",
    institution: "故宫博物院",
    inscription: "新成甲",
    script: "鸟虫书篆",
    mode: "白文",
    reading: "右起顺读",
    summary: "三字白文汉代私印，以装饰性鸟虫书篆入印，文字结构与方形印面相互牵引。",
    history: [
      "故宫博物院将此印定为汉代私印。器物以白玉琢成鼻钮，印面三字使用鸟虫书篆，采用白文。",
      "公开著录记录其右起顺读。页面生成图只呈现鸟虫篆、白文和三字章法的教学抽象，不复制原印笔画与玉色。",
    ],
    analysis: [
      { title: "鸟虫篆装饰", body: "笔画以鸟虫形意组织，装饰性高于一般汉印篆；教学字形明确标记为现代生成。", termSlug: "niaochong" },
      { title: "三字横排", body: "三字在方形印面中横向展开，以密度和边栏保持整体稳定。", termSlug: "zhangfa" },
      { title: "白文留红", body: "文字为凹刻白文，教学印蜕以字白底红解释朱白关系。", termSlug: "baiwen" },
    ],
    relatedTermSlugs: ["niaochong", "baiwen", "zhangfa", "yinbian"],
    relatedLessonSlugs: ["zhangfa", "zhu-bai", "reading-order"],
    practiceText: "方寸印",
    source: {
      title: "白玉鼻钮“新成甲”印",
      institution: "故宫博物院",
      url: "https://www.dpm.org.cn/collection/seal/229683.html",
      accessedAt: "2026-08-12",
      license: "仅引用公开藏品著录，未转载藏品图片",
      usageLimits: "教学复原可用于站内讲解；文物图片须前往原藏品页查看与申请授权",
    },
    reconstructionNotice: "页面印蜕由方寸根据公开著录与 Seal DSL 生成，用于鸟虫篆与三字章法教学，不是文物原图，也不用于真伪鉴定。",
    model3d: {
      dimensionsMm: { width: 23, depth: 23, height: 19 },
      knobVariant: "arched",
    },
    dsl: {
      text: "新成甲",
      mode: "yin",
      style: "bird_worm_han_private",
      script: "bird_worm",
      shape: { type: "square", ratio: 1 },
      layout: { strategy: "horizontal_3", density: 0.78, readingOrder: "traditional" },
      border: { type: "single", width: 0.04, distress: 0.02, corner: 0.01 },
      grid: { type: "none", width: 0.018 },
      impression: { distress: 0.1, inkUneven: 0.08, bleed: 0.006, seed: 100005 },
      physical: { sizeMm: 23, material: "jade" },
    },
  },
] as const satisfies readonly HistoricSealEntry[];

export function findHistoricSeal(slug: string): HistoricSealEntry | undefined {
  return historicSealEntries.find((entry) => entry.slug === slug);
}
