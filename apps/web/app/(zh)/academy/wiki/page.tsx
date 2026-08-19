import type { Metadata } from "next";
import Link from "next/link";
import { wikiEntries } from "@fangcun/knowledge/wiki";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import styles from "./wiki.module.css";

export const metadata: Metadata = {
  title: "印章小百科｜方寸篆刻学院",
  description: "从真实印蜕与权威来源认识朱文、白文、汉印、古玺、章法等 12 个篆刻核心术语。",
};

const categoryLabels = {
  mode: "印式",
  style: "风格",
  layout: "章法",
  form: "形制与用途",
  material: "材料",
  process: "制作与钤拓",
} as const;

export default function WikiIndexPage() {
  const definedTermSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "方寸印章小百科",
    description: metadata.description,
    hasDefinedTerm: wikiEntries.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.nameZh,
      termCode: entry.slug,
    })),
  };

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="百科路径"><Link href="/academy">篆刻学院</Link><span>›</span><span>印章小百科</span></nav>
        <header className={styles.hero}>
          <div>
            <p>FANGCUN ENCYCLOPEDIA · K3</p>
            <h1>印章小百科</h1>
            <span>从一方真实印蜕出发，分清名词、看懂结构，再带着概念回到创作。</span>
          </div>
          <div aria-label="已发布 12 个核心词条" className={styles.counter}><strong>12</strong><span>核心词条<br />已核验来源</span></div>
        </header>
        <section aria-labelledby="term-list-heading" className={styles.catalog}>
          <header><div><small>CORE TERMS</small><h2 id="term-list-heading">先从这些词开始</h2></div><p>每条含两组可切换的真实 SVG 图例、关联术语和参考来源。</p></header>
          <div className={styles.grid}>
            {wikiEntries.map((entry, index) => (
              <Link className={`paper-panel ${styles.card}`} href={`/academy/wiki/${entry.slug}`} key={entry.slug}>
                <span className={styles.order}>{String(index + 1).padStart(2, "0")}</span>
                <div className={styles.term}>
                  <strong>{entry.nameZh}</strong>
                  <span>{entry.pinyinZh}</span>
                </div>
                <p>{entry.oneLinerZh}</p>
                <footer><span>{categoryLabels[entry.category]}</span><span>{entry.references.length} 条来源</span><Icon name="arrow" size={14} /></footer>
              </Link>
            ))}
          </div>
        </section>
        <aside className={styles.note}>
          <Icon name="book" size={24} />
          <p><strong>持续校订</strong><span>词条只陈述可核验信息，并标注来源与更新时间。发现问题，欢迎通过参考资料继续核对。</span></p>
          <Link className="outline-button" href="/academy">返回课程</Link>
        </aside>
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSet).replace(/</g, "\\u003c") }} type="application/ld+json" />
      </main>
      <SiteFooter />
    </div>
  );
}
