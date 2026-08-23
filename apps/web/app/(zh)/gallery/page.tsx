import { GalleryPage } from "@/components/experiences/gallery/gallery-page";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";

export default function GalleryRoute() {
  return <div className="paper-page"><SiteHeader /><GalleryPage /><SiteFooter /></div>;
}
