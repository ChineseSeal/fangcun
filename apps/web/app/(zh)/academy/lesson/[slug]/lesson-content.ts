import type { ComponentType } from "react";
import DaoYintui from "@/content/academy/dao-yintui.mdx";
import ReadingOrder from "@/content/academy/reading-order.mdx";
import Yinni from "@/content/academy/yinni.mdx";
import Zhangfa from "@/content/academy/zhangfa.mdx";
import ZhuBai from "@/content/academy/zhu-bai.mdx";

const lessonContent: Record<string, ComponentType> = {
  "dao-yintui": DaoYintui,
  "reading-order": ReadingOrder,
  yinni: Yinni,
  zhangfa: Zhangfa,
  "zhu-bai": ZhuBai,
};

export function findLessonContent(slug: string): ComponentType | undefined {
  return lessonContent[slug];
}
