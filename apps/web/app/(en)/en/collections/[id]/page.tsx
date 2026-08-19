import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryCollectionPage } from "@/components/experiences/gallery/gallery-collection-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Collection | Fangcun",
  description: "A creator-arranged collection of references to reviewed seal works.",
  locale: "en",
  path: "/collections",
});

export default async function EnglishCollectionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="paper-page"><SiteHeader locale="en" /><GalleryCollectionPage collectionId={id} locale="en" /><SiteFooter locale="en" /></div>;
}
