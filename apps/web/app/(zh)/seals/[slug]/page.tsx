import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { historicSealEntries, findHistoricSeal, type HistoricSealDsl } from "@fangcun/knowledge/historic-seals";
import { termSeeds } from "@fangcun/knowledge";
import { lessonSeeds } from "@fangcun/knowledge/lessons";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { renderSeal, type RenderedSeal } from "@fangcun/seal-engine";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { ConceptCompare } from "@/components/knowledge/concept-compare";
import { SealAnnotationLayer } from "@/components/knowledge/seal-annotation-layer";
import { TermPopover } from "@/components/knowledge/term-popover";
import { HistoricSeal3dPanel } from "@/components/seal-3d/historic-seal-3d-panel";
import { deriveHistoricSeal3dModel, historicSealStudioHref } from "@/lib/historic-seal";
import styles from "./seal-detail.module.css";

type SealDetailProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return historicSealEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: SealDetailProps): Promise<Metadata> {
  const entry = findHistoricSeal((await params).slug);
  return entry ? {
    title: `${entry.title}｜方寸印库`,
    description: entry.summary,
  } : {};
}

async function renderEducationalSeal(dsl: HistoricSealDsl): Promise<RenderedSeal> {
  const catalog = await loadGlyphCatalogForText(dsl.text);
  const rendered = renderSeal(dsl, catalog);
  if (!rendered.ok) throw new Error(`Historic seal DSL failed: ${rendered.errors.map((error) => error.code).join(",")}`);
  if (rendered.missingGlyphs.length > 0) throw new Error(`Historic seal glyphs missing: ${rendered.missingGlyphs.join(",")}`);
  return rendered;
}

export default async function SealDetailPage({ params }: SealDetailProps) {
  const entry = findHistoricSeal((await params).slug);
  if (!entry) notFound();
  const [mainSeal, reliefSeal] = await Promise.all([
    renderEducationalSeal(entry.dsl),
    renderEducationalSeal({ ...entry.dsl, mode: "yang" }),
  ]);
  const relatedTerms = entry.relatedTermSlugs
    .map((slug) => termSeeds.find((term) => term.slug === slug))
    .filter((term) => term !== undefined);
  const relatedLessons = entry.relatedLessonSlugs
    .map((slug) => lessonSeeds.find((lesson) => lesson.slug === slug))
    .filter((lesson) => lesson !== undefined);
  const primaryLearning = relatedTerms[0];
  const model3d = deriveHistoricSeal3dModel(entry, mainSeal.dsl);

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="印库路径"><Link href="/seals">印库</Link><span>›</span><span>{entry.shortTitle}</span></nav>
        <header className={styles.hero}>
          <div>
            <p>SELECTED SEAL · {entry.artifactNumber}</p>
            <h1>{entry.title}</h1>
            <small className={styles.romanized}>{entry.romanizedTitle}</small>
            <blockquote>{entry.summary}</blockquote>
            <div className={styles.badges}><span>{entry.period}</span><span>{entry.type}</span><span>{entry.mode}</span><span>{entry.script}</span></div>
          </div>
          <dl>
            <div><dt>收藏机构</dt><dd>{entry.institution}</dd></div>
            <div><dt>材质与钮式</dt><dd>{entry.material} · {entry.knob}</dd></div>
            <div><dt>尺寸</dt><dd>{entry.dimensions}</dd></div>
            <div><dt>释文</dt><dd>{entry.inscription} · {entry.reading}</dd></div>
          </dl>
        </header>

        <SealAnnotationLayer
          annotations={mainSeal.explain.annotations}
          reconstructionNotice={entry.reconstructionNotice}
          sealName={entry.shortTitle}
          sealSlug={entry.slug}
          svg={mainSeal.svg}
        />

        <div className={styles.contentGrid}>
          <article className={`paper-panel ${styles.article}`}>
            <section>
              <small>01 · OBJECT</small>
              <h2>藏品信息</h2>
              {entry.history.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
            <section>
              <small>02 · COMPOSITION</small>
              <h2>章法逐项读</h2>
              <ol className={styles.analysis}>
                {entry.analysis.map((item, index) => (
                  <li key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3><TermPopover slug={item.termSlug}>{item.title}</TermPopover></h3><p>{item.body}</p></div></li>
                ))}
              </ol>
            </section>
          </article>
          <aside className={styles.sidebar}>
            <section className="paper-panel">
              <Icon name="book" size={24} />
              <h2>出处与边界</h2>
              <p>藏品事实依据{entry.source.institution}公开著录；印蜕图是教学复原，明确与文物原图区分。</p>
              <a href={entry.source.url} rel="noreferrer" target="_blank">查看原始藏品页 <Icon name="arrow" size={13} /></a>
              <small>访问日期 {entry.source.accessedAt} · {entry.source.license}</small>
              <small>{entry.source.usageLimits}</small>
            </section>
            <section className={`paper-panel ${styles.related}`}>
              <small>RELATED LEARNING</small>
              <h2>关联学习</h2>
              {relatedTerms.map((term) => <Link href={term.cta.href} key={term.slug}><span>{term.nameZh}</span><Icon name="arrow" size={13} /></Link>)}
              {relatedLessons.map((lesson) => <Link href={`/academy/lesson/${lesson.slug}`} key={lesson.slug}><span>{lesson.title}</span><Icon name="arrow" size={13} /></Link>)}
            </section>
            <section className={`paper-panel ${styles.practice}`}>
              <Icon name="stamp" size={24} />
              <h2>借风格，不复制文物</h2>
              <p>只带入{entry.script}、{entry.reading}、{entry.mode}、边栏与印蜕状态等结构参数，并换用“{entry.practiceText}”生成新印文。</p>
              <Link className="primary-button" href={historicSealStudioHref(entry)}>使用类似风格</Link>
              <Link className={styles.albumReference} href={`/album?historic=${entry.slug}`}>入印谱参考</Link>
            </section>
          </aside>
        </div>

        <HistoricSeal3dPanel
          artifactMaterial={entry.material}
          artifactTitle={entry.shortTitle}
          dsl={mainSeal.dsl}
          knob={entry.knob}
          model={model3d}
          posterSvg={mainSeal.svg}
          slug={entry.slug}
        />

        <ConceptCompare
          eyebrow="CONCEPT COMPARE · D-806"
          left={{ description: "凹刻文字，印蜕中字白底红。", label: "白文 · 原著录印式", svg: mainSeal.svg }}
          right={{ description: "只切换印式后的教学假设。", label: "朱文 · 单变量对照", svg: reliefSeal.svg }}
          title="同文同尺寸，对照朱文与白文"
        />

        <footer className={styles.footerNav}>
          <Link href="/seals">← 返回印库</Link>
          {primaryLearning ? <Link href={primaryLearning.cta.href}>继续了解{primaryLearning.nameZh} →</Link> : null}
        </footer>
      </main>
      <SiteFooter />
    </div>
  );
}
