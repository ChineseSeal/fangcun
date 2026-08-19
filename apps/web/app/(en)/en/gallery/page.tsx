import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryPage } from "@/components/experiences/gallery/gallery-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "Gallery | Fangcun", description: "Explore seal impressions and start a new Seal DSL from an inscription.", locale: "en", path: "/gallery" });

export default function EnglishGalleryPage() {
  return <div className="paper-page"><SiteHeader locale="en" /><GalleryPage locale="en" /><SiteFooter locale="en" /></div>;
}
