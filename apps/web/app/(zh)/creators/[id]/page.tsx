import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryCreatorPage } from "@/components/experiences/gallery/gallery-creator-page";

export const metadata: Metadata = {
  title: "创作者作品｜方寸",
  description: "方寸创作者公开的审核印章作品。",
};

export default async function CreatorRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="paper-page"><SiteHeader /><GalleryCreatorPage creatorId={id} /><SiteFooter /></div>;
}
