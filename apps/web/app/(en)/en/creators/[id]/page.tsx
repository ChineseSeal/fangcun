import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryCreatorPage } from "@/components/experiences/gallery/gallery-creator-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Creator | Fangcun",
  description: "Reviewed seal works shared by a Fangcun creator.",
  locale: "en",
  path: "/creators",
});

export default async function EnglishCreatorRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="paper-page"><SiteHeader locale="en" /><GalleryCreatorPage creatorId={id} locale="en" /><SiteFooter locale="en" /></div>;
}
