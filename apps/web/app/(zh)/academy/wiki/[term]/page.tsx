import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeSealDsl } from "@fangcun/dsl-schema";
import { termSeeds } from "@fangcun/knowledge";
import { findWikiEntry, wikiEntries, type WikiSealExample } from "@fangcun/knowledge/wiki";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { TermRichText } from "@/components/knowledge/term-popover";
import { WikiSealComparison, type WikiSealComparisonItem } from "@/components/knowledge/wiki-seal-comparison";
import styles from "./entry.module.css";

type WikiRouteProps = { params: Promise<{ term: string }> };

const categoryLabels = {
  mode: "印式",
  style: "风格",
  layout: "章法",
  form: "形制与用途",
  material: "材料",
  process: "制作与钤拓",
} as const;

export function generateStaticParams() {
  return wikiEntries.map((entry) => ({ term: entry.slug }));
}

export async function generateMetadata({ params }: WikiRouteProps): Promise<Metadata> {
  const entry = findWikiEntry((await params).term);
  return entry ? {
    title: `${entry.nameZh}是什么｜方寸印章小百科`,
    description: entry.oneLinerZh,
    keywords: [entry.nameZh, ...entry.aliases, "篆刻", "印章"],
  } : {};
}

function normalizeExample(item: WikiSealExample): WikiSealComparisonItem {
  const normalized = normalizeSealDsl(item.dsl);
  if (!normalized.ok) throw new Error(`Wiki example DSL is invalid: ${item.labelZh}`);
  return { labelZh: item.labelZh, captionZh: item.captionZh, dsl: normalized.value };
}

export default async function WikiEntryPage({ params }: WikiRouteProps) {
  const entry = findWikiEntry((await params).term);
  if (!entry) notFound();
  const examples: readonly [WikiSealComparisonItem, WikiSealComparisonItem] = [
    normalizeExample(entry.examples[0]),
    normalizeExample(entry.examples[1]),
  ];
  const related = entry.relatedSlugs
    .map((slug) => termSeeds.find((term) => term.slug === slug))
    .filter((item) => item !== undefined);
  const definedTerm = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.nameZh,
    alternateName: entry.aliases,
    description: entry.oneLinerZh,
    termCode: entry.slug,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "方寸印章小百科",
    },
    sameAs: entry.references.map((reference) => reference.url),
  };

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="百科路径"><Link href="/academy">篆刻学院</Link><span>›</span><Link href="/academy/wiki">印章小百科</Link><span>›</span><span>{entry.nameZh}</span></nav>
        <header className={styles.hero}>
          <div className={styles.titleBlock}>
            <p>{categoryLabels[entry.category]} · {entry.termEn.toUpperCase()}</p>
            <h1>{entry.nameZh}</h1>
            <div><span>{entry.pinyinZh}</span><span>{entry.termEnGloss}</span></div>
          </div>
          <blockquote>{entry.oneLinerZh}</blockquote>
          <div aria-hidden="true" className={styles.heroMark}>{entry.nameZh.slice(0, 1)}</div>
        </header>
        <WikiSealComparison examples={examples} termCategory={entry.category} termName={entry.nameZh} termSlug={entry.slug} />
        <div className={styles.contentGrid}>
          <article className={`paper-panel ${styles.article}`}>
            {entry.sections.map((section, index) => (
              <section key={section.heading}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}><TermRichText text={paragraph} /></p>)}
              </section>
            ))}
            <aside className={styles.misconception}>
              <Icon name="search" size={22} />
              <div><strong>常见误区</strong><p>{entry.misconceptionZh}</p></div>
            </aside>
          </article>
          <aside className={styles.sidebar}>
            <section className="paper-panel">
              <small>TERM CARD</small>
              <dl>
                <div><dt>别名</dt><dd>{entry.aliases.length ? entry.aliases.join("、") : "—"}</dd></div>
                <div><dt>分类</dt><dd>{categoryLabels[entry.category]}</dd></div>
                <div><dt>置信度</dt><dd>{entry.certainty === "high" ? "高" : "中"}</dd></div>
                <div><dt>更新</dt><dd>{entry.updatedAt}</dd></div>
              </dl>
            </section>
            <section className={`paper-panel ${styles.related}`}>
              <small>RELATED</small>
              <h2>关联词条</h2>
              {related.length ? related.map((item) => <Link href={item.cta.href} key={item.slug}><span>{item.nameZh}</span><Icon name="arrow" size={13} /></Link>) : <Link href="/academy/wiki">浏览全部词条 <Icon name="arrow" size={13} /></Link>}
            </section>
            <section className={`paper-panel ${styles.practice}`}>
              <Icon name="stamp" size={22} />
              <h2>带着概念去创作</h2>
              <p>图例参数可在工作台继续调整，观察它在不同印文中的变化。</p>
              <Link className="primary-button" href={`/studio?term=${entry.slug}&text=${encodeURIComponent(entry.examples[0].dsl.text)}`}>打开创作台</Link>
            </section>
          </aside>
        </div>
        <section aria-labelledby="references-heading" className={styles.references}>
          <header><div><small>SOURCES</small><h2 id="references-heading">参考资料</h2></div><span>共 {entry.references.length} 条 · 外部链接</span></header>
          <ol>
            {entry.references.map((reference) => (
              <li key={reference.url}><a href={reference.url} rel="noreferrer" target="_blank"><span>{reference.title}</span><small>{reference.author} · {reference.year}</small><Icon name="arrow" size={13} /></a></li>
            ))}
          </ol>
        </section>
        <footer className={styles.footerNav}><Link href="/academy/wiki">← 返回印章小百科</Link><Link href={`/academy/lesson/${entry.lessonSlugs[0]}`}>继续学习相关课程 →</Link></footer>
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTerm).replace(/</g, "\\u003c") }} type="application/ld+json" />
      </main>
      <SiteFooter />
    </div>
  );
}
