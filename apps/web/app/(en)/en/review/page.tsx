import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GalleryReviewPage } from "@/components/experiences/gallery/review-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "Review workbench | Fangcun", description: "A server-verified workspace for reviewing public gallery submissions.", locale: "en", path: "/review" });

export default function EnglishReviewPage() {
  return <div className="paper-page"><SiteHeader locale="en" /><GalleryReviewPage locale="en" /><SiteFooter locale="en" /></div>;
}
