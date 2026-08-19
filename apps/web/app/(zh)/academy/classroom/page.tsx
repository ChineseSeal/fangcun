import type { Metadata } from "next";
import { ClassroomIndex } from "@/components/academy/classroom-index";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "课堂练习与班级合集 | 方寸",
  description: "使用有边界的篆刻练习模板，在私有课堂中收集学生固定项目版本。",
  locale: "zh-Hans",
  path: "/academy/classroom",
});

export default function ClassroomPage() {
  return <div className="paper-page"><SiteHeader /><ClassroomIndex /><SiteFooter /></div>;
}
