import { historicSealEntries, type HistoricSealDsl, type HistoricSealEntry } from "@fangcun/knowledge/historic-seals";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { renderSeal } from "@fangcun/seal-engine";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { historicSealStudioHref } from "@/lib/historic-seal";
import { SealsCatalog, type SealCatalogRecord } from "./seals-catalog";
import styles from "./seals.module.css";

async function createCatalogRecord(entry: HistoricSealEntry): Promise<SealCatalogRecord> {
  const catalog = await loadGlyphCatalogForText(entry.dsl.text);
  const rendered = renderSeal(entry.dsl as HistoricSealDsl, catalog);
  if (!rendered.ok || rendered.missingGlyphs.length > 0) {
    throw new Error(`Historic seal preview failed: ${entry.slug}`);
  }
  return {
    slug: entry.slug,
    title: entry.title,
    shortTitle: entry.shortTitle,
    romanizedTitle: entry.romanizedTitle,
    artifactNumber: entry.artifactNumber,
    era: entry.era,
    period: entry.period,
    type: entry.type,
    material: entry.material,
    knob: entry.knob,
    dimensions: entry.dimensions,
    institution: entry.institution,
    script: entry.script,
    mode: entry.mode,
    summary: entry.summary,
    svg: rendered.svg,
    studioHref: historicSealStudioHref(entry),
  };
}

export default async function SealsPage() {
  const records = await Promise.all(historicSealEntries.map(createCatalogRecord));

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <SealsCatalog records={records} />
      </main>
      <SiteFooter />
    </div>
  );
}
