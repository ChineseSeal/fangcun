import type { Metadata } from "next";
import { ClassroomCollectionPage } from "@/components/academy/classroom-collection-page";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";

export const metadata: Metadata = {
  title: "私有课堂 | 方寸",
  description: "凭邀请码访问私有课堂，并提交一份固定的同步项目版本。",
  robots: { index: false, follow: false },
};

export default async function ClassroomCollectionRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <div className="paper-page"><SiteHeader /><ClassroomCollectionPage code={code} /><SiteFooter /></div>;
}
