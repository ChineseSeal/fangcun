import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { KnowledgeMapView } from "@/components/academy/knowledge-map-view";
import { pairedMetadata } from "@/lib/i18n";
import styles from "@/app/(zh)/academy/academy.module.css";

export const metadata: Metadata = pairedMetadata({
  title: "Knowledge map | Fangcun Academy",
  description: "See your seal-learning path through lesson progress and earned mastery marks.",
  locale: "en",
  path: "/academy/map",
});

export default function EnglishKnowledgeMapPage() {
  return (
    <div className="paper-page">
      <SiteHeader locale="en" />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="Knowledge map breadcrumb"><Link href="/en/academy">Academy</Link><span>›</span><span>Knowledge map</span></nav>
        <header>
          <p>PERSONAL KNOWLEDGE MAP · V2</p>
          <h1>Connect what you have learned.</h1>
          <span>Lessons, the introductory quiz, and earned marks meet here. The map keeps mastery evidence only: no failed attempts, rankings, or streaks.</span>
        </header>
        <KnowledgeMapView locale="en" />
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
