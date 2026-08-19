import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { KnowledgeMapView } from "@/components/academy/knowledge-map-view";
import styles from "../academy.module.css";

export const metadata: Metadata = {
  title: "知识地图｜方寸篆刻学院",
  description: "根据课程进度与掌握印记，查看自己的篆刻知识学习路径。",
};

export default function KnowledgeMapPage() {
  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="知识地图路径"><Link href="/academy">篆刻学院</Link><span>›</span><span>知识地图</span></nav>
        <header>
          <p>PERSONAL KNOWLEDGE MAP · V2</p>
          <h1>把学过的概念，连成一条路。</h1>
          <span>课程、识印小测与印记会汇聚在这里。地图只显示掌握证据，不记录错题，也不设排名。</span>
        </header>
        <KnowledgeMapView />
      </main>
      <SiteFooter />
    </div>
  );
}
