export type AchievementEventName =
  | "carving_exported"
  | "historic_seal_saved"
  | "quiz_completed"
  | "seal_book_created"
  | "seal_generated"
  | "side_inscription_completed"
  | "style_collection_updated";

export type AchievementCondition =
  | { event: "carving_exported" }
  | { event: "historic_seal_saved"; minimumSavedCount: number }
  | { event: "quiz_completed"; minimumCompletedCount: number }
  | { event: "quiz_completed"; minimumScore: number; setSlug: string }
  | { event: "seal_book_created" }
  | { event: "seal_generated" }
  | { event: "side_inscription_completed" }
  | { event: "style_collection_updated"; minimumEraCount: number };

export type AchievementDefinition = {
  code: string;
  nameZh: string;
  sealText: string;
  descriptionZh: string;
  condition: AchievementCondition;
};

export const achievementDefinitions = [
  {
    code: "chu_ke",
    nameZh: "初刻",
    sealText: "初",
    descriptionZh: "成功生成第一枚印章",
    condition: { event: "seal_generated" },
  },
  {
    code: "shi_zhu_bai",
    nameZh: "识朱白",
    sealText: "朱白",
    descriptionZh: "入门小测达到 4 / 5 题",
    condition: { event: "quiz_completed", minimumScore: 4, setSlug: "intro" },
  },
  {
    code: "tong_si_dai",
    nameZh: "通四代",
    sealText: "通",
    descriptionZh: "生成过四个不同时代风格",
    condition: { event: "style_collection_updated", minimumEraCount: 4 },
  },
  {
    code: "ru_yin_pu",
    nameZh: "入印谱",
    sealText: "谱",
    descriptionZh: "创建第一本印谱",
    condition: { event: "seal_book_created" },
  },
  {
    code: "shang_shi",
    nameZh: "上石",
    sealText: "石",
    descriptionZh: "成功导出一份刻制辅助稿",
    condition: { event: "carving_exported" },
  },
  {
    code: "du_yin_ren",
    nameZh: "读印人",
    sealText: "读",
    descriptionZh: "完成十组识印小测",
    condition: { event: "quiz_completed", minimumCompletedCount: 10 },
  },
  {
    code: "cang_yin",
    nameZh: "藏印",
    sealText: "藏",
    descriptionZh: "收藏二十枚历史印",
    condition: { event: "historic_seal_saved", minimumSavedCount: 20 },
  },
  {
    code: "bian_kuan",
    nameZh: "边款",
    sealText: "款",
    descriptionZh: "完成第一个边款",
    condition: { event: "side_inscription_completed" },
  },
] as const satisfies readonly AchievementDefinition[];

export type AchievementCode = (typeof achievementDefinitions)[number]["code"];

export const achievementCodes = achievementDefinitions.map((definition) => definition.code) as readonly AchievementCode[];

export function isAchievementCode(value: unknown): value is AchievementCode {
  return typeof value === "string" && achievementCodes.some((code) => code === value);
}
