import type { Metadata } from "next";
import { ClassroomCollectionPage } from "@/components/academy/classroom-collection-page";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";

export const metadata: Metadata = {
  title: "Private classroom | Fangcun",
  description: "Use an invitation code to open a private classroom and submit one frozen synchronized project version.",
  robots: { index: false, follow: false },
};

export default async function EnglishClassroomCollectionRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <div className="paper-page locale-en"><SiteHeader locale="en" /><ClassroomCollectionPage code={code} locale="en" /><SiteFooter locale="en" /></div>;
}
