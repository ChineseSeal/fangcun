import type {
  QuizAnswerResult,
  QuizPublicItem,
  QuizPublicSet,
  QuizVisualDsl,
} from "./quizzes";

type QuizItem = QuizPublicItem & {
  answerId: string;
  explanationZh: string;
  lessonSlugs: readonly string[];
};

export type QuizSet = Omit<QuizPublicSet, "items"> & {
  items: readonly QuizItem[];
};

const border = {
  type: "single",
  width: 0.045,
  distress: 0.1,
  corner: 0.015,
} as const;

function visual(
  text: string,
  mode: QuizVisualDsl["mode"],
  script: QuizVisualDsl["script"],
  seed: number,
  options: Partial<Pick<QuizVisualDsl, "style" | "layout" | "border" | "grid">> = {},
): QuizVisualDsl {
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
    border: options.border ?? border,
    grid: options.grid,
    impression: {
      distress: 0.1,
      inkUneven: 0.07,
      bleed: 0.006,
      seed,
    },
  };
}

export const quizSets = [
  {
    slug: "intro",
    titleZh: "识印入门",
    summaryZh: "用五枚教学印蜕，复习朱白文、读序、界格与汉印章法。",
    durationMinutes: 2,
    items: [
      {
        id: "intro-baiwen",
        kind: "mode",
        promptZh: "这枚印蜕中字白、底红，属于哪一种印式？",
        options: [
          { id: "zhuwen", labelZh: "朱文" },
          { id: "baiwen", labelZh: "白文" },
          { id: "jiege", labelZh: "界格" },
        ],
        answerId: "baiwen",
        explanationZh: "字为纸色、底部着印泥色，所以是白文；白文说的是印蜕中文字留白，并不是使用白色印泥。",
        termSlugs: ["baiwen", "zhuwen"],
        lessonSlugs: ["zhu-bai"],
        visualDsl: visual("方寸", "yin", "han_seal", 2101, { style: "han_private" }),
      },
      {
        id: "intro-zhuwen",
        kind: "mode",
        promptZh: "观察文字本身的颜色，这枚印蜕应判断为？",
        options: [
          { id: "baiwen", labelZh: "白文" },
          { id: "zhuwen", labelZh: "朱文" },
          { id: "manbai", labelZh: "满白" },
        ],
        answerId: "zhuwen",
        explanationZh: "文字着印泥色、字外保留纸色，所以是朱文。判断朱白文时先看文字，不以边框粗细作依据。",
        termSlugs: ["zhuwen", "baiwen"],
        lessonSlugs: ["zhu-bai"],
        visualDsl: visual("清和", "yang", "xiaozhuan", 2102, { style: "xiaozhuan" }),
      },
      {
        id: "intro-reading-order",
        kind: "reading-order",
        promptZh: "这枚二字横排教学印按传统读序排列，应从哪一侧起读？",
        options: [
          { id: "right-to-left", labelZh: "从右向左" },
          { id: "left-to-right", labelZh: "从左向右" },
          { id: "top-to-bottom", labelZh: "从上向下" },
        ],
        answerId: "right-to-left",
        explanationZh: "传统二字横排从右向左读，因此右侧为“应”、左侧为“衢”。读序要结合排位观察，不能套用现代横排习惯。",
        termSlugs: ["zhangfa"],
        lessonSlugs: ["zhangfa"],
        visualDsl: visual("应衢", "yin", "han_seal", 2103, {
          style: "han_private",
          layout: { strategy: "horizontal_2", density: 0.76, readingOrder: "traditional" },
          border: { ...border, type: "thick" },
        }),
      },
      {
        id: "intro-grid",
        kind: "layout",
        promptZh: "印面内部用于分隔字位的十字线，在篆刻章法中称作什么？",
        options: [
          { id: "jiege", labelZh: "界格" },
          { id: "yinbian", labelZh: "印边" },
          { id: "yinniu", labelZh: "印钮" },
        ],
        answerId: "jiege",
        explanationZh: "印面内部组织字位、帮助辨认读序的分隔线称为界格；外缘是印边，印钮则位于印章实体顶部。",
        termSlugs: ["jiege", "zhangfa"],
        lessonSlugs: ["zhangfa"],
        visualDsl: visual("天地之印", "yin", "xiaozhuan", 2104, {
          style: "qin_formal",
          grid: { type: "tian", width: 0.024 },
        }),
      },
      {
        id: "intro-han-layout",
        kind: "style",
        promptZh: "观察这枚教学印蜕，哪项更符合它当前呈现的章法特征？",
        options: [
          { id: "square-full", labelZh: "方整紧密，四字趋向平满" },
          { id: "bird-worm", labelZh: "鸟虫装饰突出，线条盘绕" },
          { id: "guxi-free", labelZh: "边界不规则，字位自由错落" },
        ],
        answerId: "square-full",
        explanationZh: "这枚教学印采用方形边界、四字分区与较高密度，呈现方整紧密、趋向平满的汉印式章法。风格判断需综合多项特征，不能只凭一个笔画断代。",
        termSlugs: ["han-seal", "zhangfa", "manbai"],
        lessonSlugs: ["zhangfa"],
        visualDsl: visual("安乐延寿", "yin", "han_seal", 2105, {
          style: "han_private",
          layout: { strategy: "grid_2x2", density: 0.86, readingOrder: "traditional" },
          border: { ...border, type: "thick" },
        }),
      },
    ],
  },
] as const satisfies readonly QuizSet[];

export const quizSetSlugs = quizSets.map((set) => set.slug);

export function findQuizSet(slug: string): QuizSet | undefined {
  return quizSets.find((set) => set.slug === slug);
}

export function toPublicQuizSet(set: QuizSet): QuizPublicSet {
  return {
    slug: set.slug,
    titleZh: set.titleZh,
    summaryZh: set.summaryZh,
    durationMinutes: set.durationMinutes,
    items: set.items.map(({ answerId: _answerId, explanationZh: _explanationZh, lessonSlugs: _lessonSlugs, ...item }) => item),
  };
}

export function gradeQuizAnswer(
  setSlug: string,
  questionId: string,
  selectedOptionId: string,
): QuizAnswerResult | undefined {
  const set = findQuizSet(setSlug);
  const question = set?.items.find((item) => item.id === questionId);
  if (!question || !question.options.some((option) => option.id === selectedOptionId)) return undefined;

  return {
    questionId,
    selectedOptionId,
    correctOptionId: question.answerId,
    correct: selectedOptionId === question.answerId,
    explanationZh: question.explanationZh,
    termSlugs: question.termSlugs,
    lessonSlugs: question.lessonSlugs,
  };
}
