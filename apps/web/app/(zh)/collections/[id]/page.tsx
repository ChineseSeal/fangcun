import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryCollectionPage } from "@/components/experiences/gallery/gallery-collection-page";

export const metadata: Metadata = {
  title: "用户合集｜方寸",
  description: "以作品引用编排的方寸用户印谱合集。",
};

export default async function CollectionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="paper-page"><SiteHeader /><GalleryCollectionPage collectionId={id} /><SiteFooter /></div>;
}
