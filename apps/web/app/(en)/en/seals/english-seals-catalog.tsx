"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/design-system/icons";
import styles from "@/app/(zh)/seals/seals.module.css";

export type EnglishSealRecord = {
  slug: string;
  shortTitle: string;
  romanizedTitle: string;
  artifactNumber: string;
  era: "Warring States" | "Han";
  period: string;
  type: string;
  material: string;
  knob: string;
  dimensions: string;
  institution: string;
  script: string;
  mode: string;
  summary: string;
  svg: string;
  studioHref: string;
};

const eras = ["All", "Warring States", "Han"] as const;
const scripts = ["All", "Guxi", "Han seal", "Bird-and-worm"] as const;

export function EnglishSealsCatalog({ records }: { records: readonly EnglishSealRecord[] }) {
  const [era, setEra] = useState<(typeof eras)[number]>("All");
  const [script, setScript] = useState<(typeof scripts)[number]>("All");
  const visible = records.filter((record) => (era === "All" || record.era === era) && (script === "All" || record.script === script));
  const featured = visible[0];
  return <>
    <section className={styles.intro}>
      <div><h1>Archive <small>Historic seal library</small></h1><p>Read composition through source-traceable teaching reconstructions.</p></div>
      <div aria-label="Filter by period" className={styles.timeline}>{eras.map((item) => <button aria-pressed={era === item} className={era === item ? styles.eraActive : styles.era} key={item} onClick={() => setEra(item)} type="button"><i />{item}</button>)}</div>
    </section>
    <div className={styles.filterRow}><div aria-label="Filter by script">{scripts.map((item) => <button aria-pressed={script === item} className={script === item ? styles.filterActive : styles.filter} key={item} onClick={() => setScript(item)} type="button">{item}</button>)}</div><Link className="primary-button" href="/en/create"><Icon name="stamp" />Start with your inscription</Link></div>
    <p aria-live="polite" className={styles.resultCount}>Showing {visible.length} / {records.length} verified featured seals.</p>
    {featured ? <section className={`${styles.library} ${visible.length === 1 ? styles.librarySingle : ""}`}>
      <article className={`paper-panel ${styles.featured}`}>
        <div className={styles.featuredImage}><div aria-label={`${featured.shortTitle} teaching reconstruction`} dangerouslySetInnerHTML={{ __html: featured.svg }} role="img" /><small>Teaching reconstruction · not the artifact image</small></div>
        <div className={styles.featuredCopy}><small>{featured.romanizedTitle}</small><h2>{featured.period} · {featured.shortTitle}</h2><span>{featured.type} · {featured.script} · {featured.mode}</span><p>{featured.summary}</p><dl><div><dt>Object no.</dt><dd>{featured.artifactNumber}</dd></div><div><dt>Collection</dt><dd>{featured.institution}</dd></div><div><dt>Size</dt><dd>{featured.dimensions}</dd></div><div><dt>Material</dt><dd>{featured.material} · {featured.knob}</dd></div></dl></div>
        <div className={styles.featuredActions}><Link href={`/en/seals/${featured.slug}`}><Icon name="fullscreen" />View details and annotations</Link><Link href={featured.studioHref}><Icon name="stamp" />Remix the structure</Link></div>
      </article>
      {visible.length > 1 ? <div className={styles.sealGrid}>{visible.slice(1).map((record) => <Link aria-label={`View ${record.shortTitle} details`} className={styles.sealCard} href={`/en/seals/${record.slug}`} key={record.slug}><div dangerouslySetInnerHTML={{ __html: record.svg }} /><small>{record.period} · {record.artifactNumber}</small><h3>{record.shortTitle}</h3><span>{record.script} · {record.mode}</span><p>{record.institution}</p></Link>)}</div> : null}
    </section> : <section className={`paper-panel ${styles.empty}`}><h2>No verified entries match these filters</h2><p>Change the period or script filter to continue browsing.</p><button onClick={() => { setEra("All"); setScript("All"); }} type="button">Show all featured seals</button></section>}
  </>;
}
