import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryReviewPage } from "@/components/experiences/gallery/review-page";

export default function ReviewPage() {
  return <div className="paper-page"><SiteHeader /><GalleryReviewPage /><SiteFooter /></div>;
}
