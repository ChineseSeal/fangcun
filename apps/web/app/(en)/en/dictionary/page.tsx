import type { Metadata } from "next";
import Link from "next/link";
import type { GlyphScript, GlyphVariant } from "@fangcun/glyph-tools";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { GlyphSpecimen } from "@/components/design-system/glyph-specimen";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { pairedMetadata } from "@/lib/i18n";
import styles from "@/app/(zh)/dictionary/dictionary.module.css";

export const metadata: Metadata = pairedMetadata({ title: "Dictionary | Fangcun", description: "Compare traceable forms of a Chinese character across major seal scripts.", locale: "en", path: "/dictionary" });

const variants: ReadonlyArray<{ name: string; era: string; script: GlyphScript }> = [
  { name: "Oracle bone", era: "Late Shang", script: "jiaguwen" }, { name: "Bronze", era: "Western Zhou", script: "jinwen" }, { name: "Small Seal", era: "Shuowen tradition", script: "xiaozhuan" }, { name: "Guxi", era: "Warring States", script: "guxi" }, { name: "Han seal", era: "Western Han", script: "han_seal" }, { name: "Bird-and-worm", era: "Warring States to Han", script: "bird_worm" },
];

function preferredVariant(catalog: readonly GlyphVariant[], script: GlyphScript) {
  return catalog.filter((variant) => variant.character === "印" && variant.script === script).sort((left, right) => Number(left.isModernSealized) - Number(right.isModernSealized))[0];
}

export default async function EnglishDictionaryPage() {
  const catalog = await loadGlyphCatalogForText("印");
  const glyphs = new Map(variants.map((variant) => [variant.script, preferredVariant(catalog, variant.script)]));
  const primaryGlyph = glyphs.get("xiaozhuan");
  return <div className="paper-page"><SiteHeader locale="en" /><main className={`page-container ${styles.page}`}>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/en">Home</Link><span>›</span><Link href="/en/dictionary">Dictionary</Link><span>›</span><span lang="zh-Hans">印</span></nav>
    <section className={styles.layout}><div>
      <header className={styles.wordHero}><div className={styles.brushWord}>{primaryGlyph ? <GlyphSpecimen character="印" confidence={primaryGlyph.confidence} isModernSealized={primaryGlyph.isModernSealized} path={primaryGlyph.svgPath} script={primaryGlyph.script} /> : <span lang="zh-Hans">印</span>}<i>SEAL</i></div><div><h1>yìn <span>common character</span></h1><p>Radical: 卩 · 6 strokes · left-right structure</p><strong>Core meanings:</strong> seal or signet; impression or mark; to stamp or print.<blockquote lang="zh-Hans">《说文解字》：“印，执政所持信也。”</blockquote></div></header>
      <section className={styles.variantGrid} aria-label="Historic forms of the character yin">{variants.map((variant) => { const glyph = glyphs.get(variant.script); return <article key={variant.name}><h2>{variant.name}</h2>{glyph ? <GlyphSpecimen character="印" className={styles.variantGlyph} confidence={glyph.confidence} isModernSealized={glyph.isModernSealized} path={glyph.svgPath} script={glyph.script} /> : <span className={styles.pendingGlyph}>Pending</span>}<span>{variant.era}</span>{glyph?.isModernSealized ? <strong aria-label="Deterministic modern extension" className={styles.sourceMark}>M</strong> : null}</article>; })}</section>
      <details className={styles.sourceLegend}><summary><span><i>M</i> Glyph source notes</span><span>View provenance</span></summary><p>“M” marks a deterministic modern seal-script extension from a traceable source glyph. It is not a character-by-character artifact tracing.</p><ul>{variants.map((variant) => { const glyph = glyphs.get(variant.script); return <li key={variant.name}><strong>{variant.name}</strong><span lang={glyph?.source ? "zh-Hans" : undefined}>{glyph?.source ?? "No publishable form yet"}</span></li>; })}</ul></details>
      <section className={`paper-panel ${styles.evolution}`}><h2>Form evolution <small>documented forms and modern extensions remain visibly distinct</small></h2><div>{variants.map((stage, index) => { const glyph = glyphs.get(stage.script); return <div key={stage.name}>{index > 0 ? <i>→</i> : null}{glyph ? <GlyphSpecimen character="印" className={styles.evolutionGlyph} confidence={glyph.confidence} isModernSealized={glyph.isModernSealized} path={glyph.svgPath} script={glyph.script} /> : <span className={styles.pendingGlyph}>Pending</span>}<span>{stage.name}<small>{stage.era}</small></span></div>; })}</div><p>The character <span lang="zh-Hans">印</span> originally referred to an official token of authority. Small Seal forms use the licensed Shuowen source; Guxi prefers licensed material where available. Other missing forms are deterministically extended and clearly marked as modern.</p></section>
    </div><aside className={styles.sidebar}>
      <section className="paper-panel"><div className={styles.sideHeading}><h2>Core terminology</h2></div><div className={styles.related}>{["朱", "白", "篆", "玺", "印"].map((char) => <span lang="zh-Hans" key={char}>{char}</span>)}</div></section>
      <label className={styles.search}><input aria-label="Search the dictionary" placeholder="Search characters" /><Icon name="search" /></label>
      <Link className={`primary-button ${styles.makeSeal}`} href="/en/create?text=%E5%8D%B0">Make a seal with <span lang="zh-Hans">印</span></Link>
      <section className={`paper-panel ${styles.explain}`}><h2>Six essential terms</h2><p><strong>Zhuwen</strong>: relief inscription, red characters on a pale ground.</p><p><strong>Baiwen</strong>: intaglio inscription, pale characters on a red ground.</p><p><strong>Han seal</strong>: a Han-dynasty seal tradition often associated with square composition and Baiwen.</p><p><strong>Guxi</strong>: pre-Qin, especially Warring States, seal traditions.</p><p><strong>Zhangfa</strong>: the overall composition of glyphs, voids, and borders.</p><p><strong>Seal impression</strong>: the stamped result on paper; a <strong>side inscription</strong> is carved on the seal body.</p></section>
    </aside></section>
  </main><SiteFooter locale="en" /></div>;
}
