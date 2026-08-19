import Link from "next/link";
import type { GlyphScript, GlyphVariant } from "@fangcun/glyph-tools";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { GlyphSpecimen } from "@/components/design-system/glyph-specimen";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import styles from "./dictionary.module.css";

const variants: ReadonlyArray<{ name: string; era: string; script: GlyphScript }> = [
  { name: "甲骨文", era: "商代晚期", script: "jiaguwen" },
  { name: "金文", era: "西周中晚期", script: "jinwen" },
  { name: "小篆", era: "《说文》传本", script: "xiaozhuan" },
  { name: "古玺", era: "战国", script: "guxi" },
  { name: "汉印篆", era: "西汉", script: "han_seal" },
  { name: "鸟虫篆", era: "战国至汉", script: "bird_worm" },
] as const;

const evolution = [...variants.slice(0, 5), { name: "楷书", era: "现代", script: null }] as const;

function preferredVariant(catalog: readonly GlyphVariant[], script: GlyphScript): GlyphVariant | undefined {
  return catalog
    .filter((variant) => variant.character === "印" && variant.script === script)
    .sort((left, right) => Number(left.isModernSealized) - Number(right.isModernSealized))[0];
}

export default async function DictionaryPage() {
  const catalog = await loadGlyphCatalogForText("印");
  const glyphs = new Map(variants.map((variant) => [variant.script, preferredVariant(catalog, variant.script)]));
  const primaryGlyph = glyphs.get("xiaozhuan");
  return <div className="paper-page"><SiteHeader /><main className={`page-container ${styles.page}`}>
    <nav aria-label="面包屑" className={styles.breadcrumb}><Link href="/">首页</Link><span>›</span><Link href="/dictionary">字典</Link><span>›</span><span>印</span></nav>
    <section className={styles.layout}>
      <div>
        <header className={styles.wordHero}><div className={styles.brushWord}>{primaryGlyph ? <GlyphSpecimen character="印" confidence={primaryGlyph.confidence} isModernSealized={primaryGlyph.isModernSealized} path={primaryGlyph.svgPath} script={primaryGlyph.script} /> : <span>印</span>}<i>篆刻</i></div><div><h1>[ yìn ] <button aria-label="播放读音" className="icon-button" type="button"><Icon name="volume" /></button><span>常用字</span><span>一级字</span></h1><p>部首：卩　　笔画：6　　结构：左右　　五行：土</p><strong>本义：</strong>1. 印章、印信。 2. 痕迹、印记。 3. 压印、印刷。<blockquote>——《说文解字》：“印，执政所持信也。”</blockquote></div></header>
        <section className={styles.variantGrid} aria-label="印字历史字形">
          {variants.map((variant) => {
            const glyph = glyphs.get(variant.script);
            return <article key={variant.name}>
              <h2>{variant.name}</h2>
              {glyph ? <GlyphSpecimen character="印" className={styles.variantGlyph} confidence={glyph.confidence} isModernSealized={glyph.isModernSealized} path={glyph.svgPath} script={glyph.script} /> : <span className={styles.pendingGlyph}>待收录</span>}
              <span>{variant.era}</span>
              {glyph?.isModernSealized ? <strong aria-label="现代篆化补字" className={styles.sourceMark}>补</strong> : null}
            </article>;
          })}
        </section>
        <details className={styles.sourceLegend}>
          <summary><span><i>补</i> 字形来源说明</span><span>查看来源与授权</span></summary>
          <p>带“补”的字形是基于可追溯字形按对应书体规则确定性扩展，不等同于逐字文物摹本；未标记项优先使用文献或已授权来源。</p>
          <ul>{variants.map((variant) => {
            const glyph = glyphs.get(variant.script);
            return <li key={variant.name}><strong>{variant.name}</strong><span>{glyph?.source ?? "尚无可发布字形"}</span></li>;
          })}</ul>
        </details>
        <section className={`paper-panel ${styles.evolution}`}><h2>字形演变 <small>文献字形与现代扩展分层展示</small></h2><div>{evolution.map((stage, index) => {
          const glyph = stage.script ? glyphs.get(stage.script) : undefined;
          return <div key={stage.name}>{index > 0 ? <i>→</i> : null}{glyph ? <GlyphSpecimen character="印" className={styles.evolutionGlyph} confidence={glyph.confidence} isModernSealized={glyph.isModernSealized} path={glyph.svgPath} script={glyph.script} /> : stage.script === null ? <b>印</b> : <span className={styles.pendingGlyph}>待收录</span>}<span>{stage.name}<small>{stage.era}</small></span></div>;
        })}</div><p>“印”，本义为执政所持信物。小篆来自全字库《说文解字》，古玺优先采用已授权来源；甲骨文、金文、汉印篆、鸟虫篆及缺字部分由同一来源字形按书体规则确定性扩展，并明确标注为现代生成，不等同于逐字文物摹本。</p></section>
      </div>
      <aside className={styles.sidebar}>
        <section className="paper-panel"><div className={styles.sideHeading}><h2>相关字</h2><Link href="/dictionary">全部 <Icon name="arrow" size={15} /></Link></div><div className={styles.related}>{["印", "印", "印", "却", "邱"].map((char, index) => <button key={index} type="button">{char}</button>)}</div></section>
        <label className={styles.search}><input placeholder="搜索字典" /><Icon name="search" /></label>
        <Link className={`primary-button ${styles.makeSeal}`} href="/create?text=印">用「印」制作印章 <span>方寸</span></Link>
        <section className={`paper-panel ${styles.explain}`}><h2>说文解字</h2><div><b>卩</b><p>印，执政所持信也。从爪、卩、爪持之，信也。凡印之属皆从印。</p></div><blockquote>——《说文解字 · 印部》</blockquote><hr /><h2>字频与书写</h2><p>现代常用度：常用字</p><p>使用频率：★★★★★☆</p><p>笔顺：丶　一　ノ　乚　丨</p><button className="outline-button" type="button"><Icon name="play" />查看笔顺动画</button></section>
      </aside>
    </section>
  </main><SiteFooter /></div>;
}
