export const CLASSROOM_EXERCISE_IDS = [
  "name-seal",
  "red-white",
  "reading-order",
] as const;

export type ClassroomExerciseId = (typeof CLASSROOM_EXERCISE_IDS)[number];

export type ClassroomExercise = {
  id: ClassroomExerciseId;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  promptZh: string;
  promptEn: string;
  teacherNoteZh: string;
  teacherNoteEn: string;
  durationMinutes: number;
  studioHref: string;
};

export const classroomExercises: readonly ClassroomExercise[] = [
  {
    id: "name-seal",
    titleZh: "给自己刻一枚名章",
    titleEn: "Design a name seal",
    summaryZh: "用自己的名字或网名，完成一枚汉印白文名章。",
    summaryEn: "Use a name or nickname to make a Han-style white-script name seal.",
    promptZh: "选择一个你愿意分享的名字，观察白文如何让文字与边界互相支撑。",
    promptEn: "Choose a name you are comfortable sharing and study how white script meets the border.",
    teacherNoteZh: "先让学生说出想保留的字，再讨论印式、读序和留红；不要把课堂结果当作法定印鉴。",
    teacherNoteEn: "Ask learners which characters they want to keep, then discuss mode, reading order, and red space. A class result is not a legal seal.",
    durationMinutes: 15,
    studioHref: "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&script=han_seal&seed=4441&candidate=0",
  },
  {
    id: "red-white",
    titleZh: "同文对照朱文与白文",
    titleEn: "Compare red and white script",
    summaryZh: "保持文字和章法不变，只比较朱文与白文的气质。",
    summaryEn: "Keep the inscription and composition fixed while comparing the two seal modes.",
    promptZh: "先猜哪一枚会显得更厚重，再用同一组字形验证你的判断。",
    promptEn: "Predict which version will feel heavier, then test your idea with the same glyphs.",
    teacherNoteZh: "要求学生只说一个变量：印式；其余参数保持一致，避免把边框或残损误认为朱白差异。",
    teacherNoteEn: "Ask learners to name only one changing variable: seal mode. Keep border and distress fixed so the comparison stays honest.",
    durationMinutes: 10,
    studioHref: "/studio?text=%E6%9C%B1%E7%99%BD&style=xiaozhuan&mode=yin&script=xiaozhuan&seed=4442&candidate=0",
  },
  {
    id: "reading-order",
    titleZh: "把读序放回印面",
    titleEn: "Place the reading order",
    summaryZh: "用二字印比较传统右起与现代左起的排位。",
    summaryEn: "Compare traditional right-start and modern left-start placement in a two-character seal.",
    promptZh: "先指出你会从哪一格开始读，再说明排位变化是否改变了印文。",
    promptEn: "Point to the starting position first, then explain whether placement changed the inscription itself.",
    teacherNoteZh: "强调读序是排位事实，不等于所有历史印都只有一种固定规则；让学生先读图再听解释。",
    teacherNoteEn: "Reading order is a placement fact, not one universal rule for every historical seal. Let learners read the image before the explanation.",
    durationMinutes: 10,
    studioHref: "/studio?text=%E5%BA%94%E8%A1%A2&style=han_private&mode=yin&script=han_seal&seed=4443&candidate=0",
  },
] as const;

export function findClassroomExercise(id: string): ClassroomExercise | undefined {
  return classroomExercises.find((exercise) => exercise.id === id);
}
