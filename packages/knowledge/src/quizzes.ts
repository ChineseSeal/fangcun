export type QuizOption = {
  id: string;
  labelZh: string;
};

export type QuizVisualDsl = {
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

export type QuizPublicItem = {
  id: string;
  kind: "mode" | "reading-order" | "layout" | "style";
  promptZh: string;
  options: readonly QuizOption[];
  termSlugs: readonly string[];
  visualDsl: QuizVisualDsl;
};

export type QuizPublicSet = {
  slug: string;
  titleZh: string;
  summaryZh: string;
  durationMinutes: number;
  items: readonly QuizPublicItem[];
};

export type QuizAnswerResult = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  explanationZh: string;
  termSlugs: readonly string[];
  lessonSlugs: readonly string[];
};
