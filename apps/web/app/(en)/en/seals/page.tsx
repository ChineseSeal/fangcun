import type { Metadata } from "next";
import { historicSealEntries, type HistoricSealEntry } from "@fangcun/knowledge/historic-seals";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { renderSeal } from "@fangcun/seal-engine";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { historicSealStudioHref } from "@/lib/historic-seal";
import { pairedMetadata } from "@/lib/i18n";
import { englishHistoricSealCopy } from "@/lib/english-historic-seals";
import { EnglishSealsCatalog, type EnglishSealRecord } from "./english-seals-catalog";

export const metadata: Metadata = pairedMetadata({ title: "Archive | Fangcun", description: "Browse source-traceable historic seal teaching reconstructions.", locale: "en", path: "/seals" });

async function createRecord(entry: HistoricSealEntry): Promise<EnglishSealRecord> {
  const catalog = await loadGlyphCatalogForText(entry.dsl.text);
  const rendered = renderSeal(entry.dsl, catalog, { locale: "en" });
  if (!rendered.ok) throw new Error(`Historic seal preview failed: ${entry.slug}`);
  const translated = englishHistoricSealCopy[entry.slug];
  if (!translated) throw new Error(`English historic seal copy missing: ${entry.slug}`);
  return { slug: entry.slug, shortTitle: translated.displayTitle, romanizedTitle: entry.romanizedTitle, artifactNumber: entry.artifactNumber, era: entry.era === "汉" ? "Han" : "Warring States", ...translated, svg: rendered.svg, studioHref: `/en${historicSealStudioHref(entry)}` };
}

export default async function EnglishSealsPage() {
  const records = await Promise.all(historicSealEntries.map(createRecord));
  return <div className="paper-page"><SiteHeader locale="en" /><main className="page-container"><EnglishSealsCatalog records={records} /></main><SiteFooter locale="en" /></div>;
}
