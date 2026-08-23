import type { AchievementCode } from "./achievements";

export type KnowledgeMapNodeKind = "lesson" | "quiz";
export type KnowledgeMapStatus = "unexplored" | "learning" | "mastered";

export type KnowledgeMapNode = {
  id: string;
  order: number;
  kind: KnowledgeMapNodeKind;
  sealText: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  lessonSlug?: string;
  quizSlug?: string;
  termSlugs: readonly string[];
  requiredLessonSlugs: readonly string[];
  requiredAchievementCodes: readonly AchievementCode[];
};

export type KnowledgeMapEvidence = {
  startedLessonSlugs: readonly string[];
  completedLessonSlugs: readonly string[];
  earnedAchievementCodes: readonly AchievementCode[];
};

export type KnowledgeMapEntry = {
  node: KnowledgeMapNode;
  status: KnowledgeMapStatus;
  satisfiedEvidenceCount: number;
  totalEvidenceCount: number;
};

export const knowledgeMapNodes = [
  {
    id: "zhu-bai",
    order: 1,
    kind: "lesson",
    sealText: "朱白",
    titleZh: "朱文与白文",
    titleEn: "Zhuwen and Baiwen",
    summaryZh: "先看印蜕中字与底色的正负关系，建立第一组判断语言。",
    summaryEn: "Read the positive and negative relationship between characters and ground.",
    lessonSlug: "zhu-bai",
    termSlugs: ["zhuwen", "baiwen", "manbai", "xizhuwen"],
    requiredLessonSlugs: ["zhu-bai"],
    requiredAchievementCodes: [],
  },
  {
    id: "zhangfa",
    order: 2,
    kind: "lesson",
    sealText: "章法",
    titleZh: "章法与疏密",
    titleEn: "Composition and density",
    summaryZh: "观察字、边与留红怎样互相让位，理解一方印的整体秩序。",
    summaryEn: "See how glyphs, borders, and voids share space as one composition.",
    lessonSlug: "zhangfa",
    termSlugs: ["zhangfa", "jiege", "jiebian", "han-seal"],
    requiredLessonSlugs: ["zhangfa"],
    requiredAchievementCodes: [],
  },
  {
    id: "dao-yintui",
    order: 3,
    kind: "lesson",
    sealText: "刀意",
    titleZh: "刀感与印蜕",
    titleEn: "Carving character and impressions",
    summaryZh: "分清权威印面几何与残损、印泥不均共同形成的钤印结果。",
    summaryEn: "Separate authoritative geometry from wear, ink variation, and the stamped result.",
    lessonSlug: "dao-yintui",
    termSlugs: ["yintui", "cansun", "fanzi", "shangshi"],
    requiredLessonSlugs: ["dao-yintui"],
    requiredAchievementCodes: [],
  },
  {
    id: "reading-order",
    order: 4,
    kind: "lesson",
    sealText: "读序",
    titleZh: "传统读序",
    titleEn: "Traditional reading order",
    summaryZh: "用二字横排对照，理解读序是字位关系，不是现代横排的默认方向。",
    summaryEn: "Use a two-character comparison to read placement instead of assuming modern order.",
    lessonSlug: "reading-order",
    termSlugs: ["huiwen", "zhangfa", "jiege"],
    requiredLessonSlugs: ["reading-order"],
    requiredAchievementCodes: [],
  },
  {
    id: "yinni",
    order: 5,
    kind: "lesson",
    sealText: "印泥",
    titleZh: "印泥与钤印",
    titleEn: "Seal paste and stamping",
    summaryZh: "认识红色印泥、按压力度与纸面状态怎样改变印蜕观感。",
    summaryEn: "Learn how seal paste, pressure, and paper change an impression.",
    lessonSlug: "yinni",
    termSlugs: ["yinni", "qianyin", "yintui"],
    requiredLessonSlugs: ["yinni"],
    requiredAchievementCodes: [],
  },
  {
    id: "intro-quiz",
    order: 6,
    kind: "quiz",
    sealText: "识印",
    titleZh: "识印入门小测",
    titleEn: "Introductory seal quiz",
    summaryZh: "用五枚教学印蜕复习关键概念；只记录已经掌握的成就，不记录失败。",
    summaryEn: "Review five teaching impressions; only mastery is kept, never failed attempts.",
    quizSlug: "intro",
    termSlugs: ["zhuwen", "baiwen", "zhangfa", "jiege", "han-seal"],
    requiredLessonSlugs: [],
    requiredAchievementCodes: ["shi_zhu_bai"],
  },
] as const satisfies readonly KnowledgeMapNode[];

function completedEvidenceCount(node: KnowledgeMapNode, evidence: KnowledgeMapEvidence): number {
  const completedLessons = new Set(evidence.completedLessonSlugs);
  const earnedAchievements = new Set(evidence.earnedAchievementCodes);
  return node.requiredLessonSlugs.filter((slug) => completedLessons.has(slug)).length
    + node.requiredAchievementCodes.filter((code) => earnedAchievements.has(code)).length;
}

function startedEvidenceCount(node: KnowledgeMapNode, evidence: KnowledgeMapEvidence): number {
  const startedLessons = new Set([...evidence.startedLessonSlugs, ...evidence.completedLessonSlugs]);
  const earnedAchievements = new Set(evidence.earnedAchievementCodes);
  return node.requiredLessonSlugs.filter((slug) => startedLessons.has(slug)).length
    + node.requiredAchievementCodes.filter((code) => earnedAchievements.has(code)).length;
}

export function evaluateKnowledgeMap(
  nodes: readonly KnowledgeMapNode[],
  evidence: KnowledgeMapEvidence,
): KnowledgeMapEntry[] {
  return nodes.map((node) => {
    const satisfiedEvidenceCount = completedEvidenceCount(node, evidence);
    const totalEvidenceCount = node.requiredLessonSlugs.length + node.requiredAchievementCodes.length;
    const hasStartedEvidence = startedEvidenceCount(node, evidence) > 0;
    const status: KnowledgeMapStatus = satisfiedEvidenceCount === totalEvidenceCount
      ? "mastered"
      : hasStartedEvidence
        ? "learning"
        : "unexplored";
    return { node, status, satisfiedEvidenceCount, totalEvidenceCount };
  });
}
