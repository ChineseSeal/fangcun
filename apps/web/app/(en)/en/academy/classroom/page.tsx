import type { Metadata } from "next";
import { ClassroomIndex } from "@/components/academy/classroom-index";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Classroom practice and collections | Fangcun",
  description: "Use focused seal exercises and collect one frozen project version per learner in a private classroom.",
  locale: "en",
  path: "/academy/classroom",
});

export default function EnglishClassroomPage() {
  return <div className="paper-page locale-en"><SiteHeader locale="en" /><ClassroomIndex locale="en" /><SiteFooter locale="en" /></div>;
}
