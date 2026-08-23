export type LessonSealDsl = {
  text: string;
  mode: "yin" | "yang";
  style: string;
  script: "xiaozhuan" | "han_seal" | "guxi" | "bird_worm" | "jinwen" | "jiaguwen";
  layout: {
    strategy: string;
    density: number;
    readingOrder: "traditional" | "huiwen" | "modern";
  };
  border: {
    type: "none" | "single" | "thick" | "double" | "irregular" | "broken";
    width: number;
    distress: number;
    corner: number;
  };
  grid?: {
    type: "none" | "jie" | "tian" | "ri";
    width: number;
  };
  impression: {
    distress: number;
    inkUneven: number;
    bleed: number;
    seed: number;
  };
};

export type LessonInteractiveVariant = {
  id: string;
  labelZh: string;
  descriptionZh: string;
  dsl: LessonSealDsl;
};

export type LessonSeed = {
  slug: string;
  order: number;
  title: string;
  summary: string;
  oneLineAnswer: string;
  durationMinutes: number;
  sealText: string;
  interactive: {
    eyebrow: string;
    titleZh: string;
    descriptionZh: string;
    controlLabelZh: string;
    variants: readonly LessonInteractiveVariant[];
  };
  exercise: { label: string; href: string };
};

const standardBorder = {
  type: "single",
  width: 0.045,
  distress: 0.08,
  corner: 0.015,
} as const;

function visual(
  text: string,
  mode: LessonSealDsl["mode"],
  script: LessonSealDsl["script"],
  seed: number,
  options: Partial<Pick<LessonSealDsl, "style" | "layout" | "border" | "grid" | "impression">> = {},
): LessonSealDsl {
  return {
    text,
    mode,
    script,
    style: options.style ?? script,
    layout: options.layout ?? {
      strategy: Array.from(text).length === 4 ? "grid_2x2" : "vertical_2",
      density: 0.76,
      readingOrder: "traditional",
    },
    border: options.border ?? standardBorder,
    grid: options.grid,
    impression: options.impression ?? {
      distress: 0.08,
      inkUneven: 0.06,
      bleed: 0.006,
      seed,
    },
  };
}

export const lessonSeeds = [
  {
    slug: "zhu-bai",
    order: 1,
    title: "识印：朱文与白文",
    summary: "从印面颜色开始，认识两种最基本的印式。",
    oneLineAnswer: "字红底白是朱文，字白底红是白文。",
    durationMinutes: 8,
    sealText: "朱白",
    interactive: {
      eyebrow: "MODE · 单变量对照",
      titleZh: "只切换印式，观察文字颜色",
      descriptionZh: "两枚印保持文字、字形、布局与种子一致，只改变朱文 / 白文。",
      controlLabelZh: "切换朱文与白文图例",
      variants: [
        { id: "zhuwen", labelZh: "朱文", descriptionZh: "文字着红，字外保留纸色。", dsl: visual("方寸", "yang", "xiaozhuan", 3101) },
        { id: "baiwen", labelZh: "白文", descriptionZh: "文字留白，字外着印泥色。", dsl: visual("方寸", "yin", "xiaozhuan", 3101) },
      ],
    },
    exercise: { label: "去 Studio 做一枚白文名章", href: "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=3101&candidate=0" },
  },
  {
    slug: "zhangfa",
    order: 2,
    title: "读印：章法与疏密",
    summary: "理解文字如何在方寸中互让、借边与呼应。",
    oneLineAnswer: "章法是文字、留白与边界的整体安排。",
    durationMinutes: 10,
    sealText: "章法",
    interactive: {
      eyebrow: "LAYOUT · 疏密对照",
      titleZh: "同一方印，密度怎样改变呼吸",
      descriptionZh: "只改变布局密度，观察文字与边框之间的留红，以及四字重心的变化。",
      controlLabelZh: "切换疏朗与紧密章法",
      variants: [
        { id: "sparse", labelZh: "疏朗", descriptionZh: "留红较多，字与边界保持距离。", dsl: visual("清风明月", "yin", "han_seal", 3102, { style: "han_private", layout: { strategy: "grid_2x2", density: 0.58, readingOrder: "traditional" } }) },
        { id: "dense", labelZh: "紧密", descriptionZh: "字形趋近边界，整体更平满。", dsl: visual("清风明月", "yin", "han_seal", 3102, { style: "han_private", layout: { strategy: "grid_2x2", density: 0.88, readingOrder: "traditional" }, border: { ...standardBorder, type: "thick" } }) },
      ],
    },
    exercise: { label: "去 Studio 调一枚四字印", href: "/studio?text=%E6%B8%85%E9%A3%8E%E6%98%8E%E6%9C%88&style=han_private&mode=yin&seed=3102&candidate=0" },
  },
  {
    slug: "dao-yintui",
    order: 3,
    title: "赏印：刀感与印蜕",
    summary: "观察刀痕、残损与印泥如何构成时间感。",
    oneLineAnswer: "印蜕是钤盖结果，不等同于印章实体。",
    durationMinutes: 9,
    sealText: "刀意",
    interactive: {
      eyebrow: "IMPRESSION · 印蜕对照",
      titleZh: "同一几何，钤印状态也会改变观感",
      descriptionZh: "两图复用同一文字与布局，只改变残损、印泥不均和渗化参数。",
      controlLabelZh: "切换清晰与微残印蜕",
      variants: [
        { id: "clean", labelZh: "清晰印蜕", descriptionZh: "边栏与笔画保留完整，印泥较均匀。", dsl: visual("听雨", "yin", "han_seal", 3103, { style: "han_private", impression: { distress: 0.02, inkUneven: 0.03, bleed: 0.003, seed: 3103 } }) },
        { id: "worn", labelZh: "微残印蜕", descriptionZh: "局部缺失与浓淡变化来自确定性印蜕参数。", dsl: visual("听雨", "yin", "han_seal", 3103, { style: "han_private", impression: { distress: 0.38, inkUneven: 0.28, bleed: 0.018, seed: 3103 } }) },
      ],
    },
    exercise: { label: "去 Studio 调整印蜕状态", href: "/studio?text=%E5%90%AC%E9%9B%A8&style=han_private&mode=yin&seed=3103&candidate=0" },
  },
  {
    slug: "reading-order",
    order: 4,
    title: "读序：为什么从右往左",
    summary: "用二字横排印理解传统读序与现代横排的差别。",
    oneLineAnswer: "传统横排印通常右起，读序要结合字位。",
    durationMinutes: 7,
    sealText: "读序",
    interactive: {
      eyebrow: "READING ORDER · 排位对照",
      titleZh: "文字不变，起读方向改变排位",
      descriptionZh: "传统右起时首字在右；现代左起时首字在左。图例不用于推断所有历史实物。",
      controlLabelZh: "切换传统与现代横排",
      variants: [
        { id: "traditional", labelZh: "传统右起", descriptionZh: "右侧为“应”，从右向左读。", dsl: visual("应衢", "yin", "han_seal", 3104, { style: "han_private", layout: { strategy: "horizontal_2", density: 0.76, readingOrder: "traditional" }, border: { ...standardBorder, type: "thick" } }) },
        { id: "modern", labelZh: "现代左起", descriptionZh: "左侧为“应”，用作单变量对照。", dsl: visual("应衢", "yin", "han_seal", 3104, { style: "han_private", layout: { strategy: "horizontal_2", density: 0.76, readingOrder: "modern" }, border: { ...standardBorder, type: "thick" } }) },
      ],
    },
    exercise: { label: "去 Studio 观察二字排位", href: "/studio?text=%E5%BA%94%E8%A1%A2&style=han_private&mode=yin&seed=3104&candidate=0" },
  },
  {
    slug: "yinni",
    order: 5,
    title: "钤印：印泥为什么是红的",
    summary: "认识印泥、朱砂色传统与钤印状态的关系。",
    oneLineAnswer: "红色来自印泥传统，浓淡还受钤印状态影响。",
    durationMinutes: 8,
    sealText: "印泥",
    interactive: {
      eyebrow: "INK · 钤印状态对照",
      titleZh: "都是红色，印泥状态仍会留下差别",
      descriptionZh: "数字图例只模拟印蜕的均匀度与缺失，不替代对真实印泥、纸张和按压力度的观察。",
      controlLabelZh: "切换饱满与偏干印蜕",
      variants: [
        { id: "full", labelZh: "印泥饱满", descriptionZh: "着色较均匀，笔画与边栏较完整。", dsl: visual("印泥", "yang", "xiaozhuan", 3105, { impression: { distress: 0.02, inkUneven: 0.04, bleed: 0.008, seed: 3105 } }) },
        { id: "dry", labelZh: "印泥偏干", descriptionZh: "局部缺失增多，仍保持同一权威几何。", dsl: visual("印泥", "yang", "xiaozhuan", 3105, { impression: { distress: 0.3, inkUneven: 0.42, bleed: 0.004, seed: 3105 } }) },
      ],
    },
    exercise: { label: "去 Studio 重新盖印", href: "/studio?text=%E5%8D%B0%E6%B3%A5&style=xiaozhuan&mode=yang&seed=3105&candidate=0" },
  },
] as const satisfies readonly LessonSeed[];

export function findLesson(slug: string): LessonSeed | undefined {
  return lessonSeeds.find((lesson) => lesson.slug === slug);
}
