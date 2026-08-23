import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findHistoricSeal, historicSealEntries } from "@fangcun/knowledge/historic-seals";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { renderSeal } from "@fangcun/seal-engine";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { HistoricSeal3dPanel } from "@/components/seal-3d/historic-seal-3d-panel";
import { englishHistoricSealCopy } from "@/lib/english-historic-seals";
import { deriveHistoricSeal3dModel, historicSealStudioHref } from "@/lib/historic-seal";
import { pairedMetadata } from "@/lib/i18n";
import styles from "@/app/(zh)/seals/[slug]/seal-detail.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return historicSealEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const copy = englishHistoricSealCopy[slug];
  return copy ? pairedMetadata({ title: `${copy.displayTitle} | Fangcun Archive`, description: copy.summary, locale: "en", path: `/seals/${slug}` }) : {};
}

export default async function EnglishSealDetailPage({ params }: Props) {
  const entry = findHistoricSeal((await params).slug);
  if (!entry) notFound();
  const copy = englishHistoricSealCopy[entry.slug];
  if (!copy) notFound();
  const catalog = await loadGlyphCatalogForText(entry.dsl.text);
  const rendered = renderSeal(entry.dsl, catalog, { locale: "en" });
  if (!rendered.ok) throw new Error(`Historic seal render failed: ${entry.slug}`);
  const model3d = deriveHistoricSeal3dModel(entry, rendered.dsl);
  return <div className="paper-page"><SiteHeader locale="en" /><main className={`page-container ${styles.page}`}>
    <nav aria-label="Archive breadcrumb"><Link href="/en/seals">Archive</Link><span>›</span><span>{copy.displayTitle}</span></nav>
    <header className={styles.hero}><div><p>SELECTED SEAL · {entry.artifactNumber}</p><h1>{copy.displayTitle}</h1><small className={styles.romanized}>{entry.romanizedTitle}</small><blockquote>{copy.summary}</blockquote><div className={styles.badges}><span>{copy.period}</span><span>{copy.type}</span><span>{copy.mode}</span><span>{copy.script}</span></div></div><dl><div><dt>Collection</dt><dd>{copy.institution}</dd></div><div><dt>Material</dt><dd>{copy.material} · {copy.knob}</dd></div><div><dt>Dimensions</dt><dd>{copy.dimensions}</dd></div><div><dt>Inscription</dt><dd><span lang="zh-Hans">{entry.inscription}</span> · {copy.reading}</dd></div></dl></header>
    <section className={`paper-panel ${styles.article}`}><div aria-label={`${copy.displayTitle} teaching reconstruction`} dangerouslySetInnerHTML={{ __html: rendered.svg }} role="img" style={{ margin: "0 auto 32px", maxWidth: 360 }} /><section><small>01 · OBJECT</small><h2>Object record</h2>{copy.history.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section><section><small>02 · COMPOSITION</small><h2>Read the composition</h2><ol className={styles.analysis}>{copy.analysis.map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}</ol></section></section>
    <div className={styles.contentGrid}><article className={`paper-panel ${styles.article}`}><section><small>03 · SOURCE BOUNDARY</small><h2>Source and reconstruction</h2><p>Artifact facts follow the public catalogue from {copy.institution}. The seal impression above is generated from Fangcun’s Seal DSL for teaching and is not an artifact photograph or an authentication tool.</p><p>The generated geometry preserves only declared structural facts. It does not copy the original seal strokes.</p></section></article><aside className={styles.sidebar}><section className="paper-panel"><Icon name="book" size={24} /><h2>Primary source</h2><p>{entry.source.title}</p><a href={entry.source.url} rel="noreferrer" target="_blank">Open the museum record <Icon name="arrow" size={13} /></a><small>Accessed {entry.source.accessedAt}</small></section><section className={`paper-panel ${styles.practice}`}><Icon name="stamp" size={24} /><h2>Remix structure, not the artifact</h2><p>Start a new inscription with related script, reading order, mode, border, and impression parameters.</p><Link className="primary-button" href={`/en${historicSealStudioHref(entry)}`}>Use a related style</Link><Link className={styles.albumReference} href={`/en/album?historic=${entry.slug}`}>Add teaching reference to album</Link></section></aside></div>
    <HistoricSeal3dPanel artifactMaterial={copy.material} artifactTitle={copy.displayTitle} dsl={rendered.dsl} knob={copy.knob} locale="en" model={model3d} posterSvg={rendered.svg} slug={entry.slug} />
    <footer className={styles.footerNav}><Link href="/en/seals">← Back to Archive</Link><Link href="/en/dictionary">Continue with terminology →</Link></footer>
  </main><SiteFooter locale="en" /></div>;
}
