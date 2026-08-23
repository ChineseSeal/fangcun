"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/design-system/icons";
import styles from "./seals.module.css";

export type SealCatalogRecord = {
  slug: string;
  title: string;
  shortTitle: string;
  romanizedTitle: string;
  artifactNumber: string;
  era: string;
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

const eras = ["全部", "战国", "秦", "汉", "魏晋", "唐宋", "元", "明", "清"] as const;
const scripts = ["全部", "战国古文", "汉篆", "鸟虫书篆"] as const;

export function SealsCatalog({ records }: { records: readonly SealCatalogRecord[] }) {
  const [era, setEra] = useState<(typeof eras)[number]>("全部");
  const [script, setScript] = useState<(typeof scripts)[number]>("全部");
  const availableEras = new Set(records.map((record) => record.era));
  const visible = records.filter((record) =>
    (era === "全部" || record.era === era) &&
    (script === "全部" || record.script === script),
  );
  const featured = visible[0];

  return (
    <>
      <section className={styles.intro}>
        <div>
          <h1>印库 <small>Historical Seal Library</small></h1>
          <p>以公开著录为索引，用教学复原读懂章法</p>
        </div>
        <div aria-label="按时代筛选" className={styles.timeline}>
          {eras.map((item) => {
            const unavailable = item !== "全部" && !availableEras.has(item);
            return (
              <button
                aria-pressed={era === item}
                className={era === item ? styles.eraActive : styles.era}
                disabled={unavailable}
                key={item}
                onClick={() => setEra(item)}
                title={unavailable ? `${item}精选印尚待来源审核` : undefined}
                type="button"
              >
                <i />{item}
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.filterRow}>
        <div aria-label="按书体筛选">
          {scripts.map((item) => (
            <button
              aria-pressed={script === item}
              className={script === item ? styles.filterActive : styles.filter}
              key={item}
              onClick={() => setScript(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <Link className="primary-button" href="/create"><Icon name="stamp" />从自己的印文开始</Link>
      </div>

      <p aria-live="polite" className={styles.resultCount}>
        当前展示 {visible.length} / {records.length} 枚已核验精选印；禁用时代仍在来源审核中。
      </p>

      {featured ? (
        <section className={`${styles.library} ${visible.length === 1 ? styles.librarySingle : ""}`}>
          <article className={`paper-panel ${styles.featured}`}>
            <div className={styles.featuredImage}>
              <div
                aria-label={`${featured.shortTitle}教学印蜕`}
                dangerouslySetInnerHTML={{ __html: featured.svg }}
                role="img"
              />
              <small>教学复原 · 非文物原图</small>
            </div>
            <div className={styles.featuredCopy}>
              <small>{featured.romanizedTitle}</small>
              <h2>{featured.period} · {featured.shortTitle}</h2>
              <span>{featured.type} · {featured.script} · {featured.mode}</span>
              <p>{featured.summary}</p>
              <dl>
                <div><dt>藏品号</dt><dd>{featured.artifactNumber}</dd></div>
                <div><dt>收藏</dt><dd>{featured.institution}</dd></div>
                <div><dt>尺寸</dt><dd>{featured.dimensions}</dd></div>
                <div><dt>材质</dt><dd>{featured.material} · {featured.knob}</dd></div>
              </dl>
            </div>
            <div className={styles.featuredActions}>
              <Link href={`/seals/${featured.slug}`}><Icon name="fullscreen" />查看详情与章法标注</Link>
              <Link href={featured.studioHref}><Icon name="stamp" />借结构生成新印文</Link>
            </div>
          </article>

          {visible.length > 1 ? <div className={styles.sealGrid}>
            {visible.slice(1).map((record) => (
              <Link
                aria-label={`查看${record.shortTitle}详情`}
                className={styles.sealCard}
                href={`/seals/${record.slug}`}
                key={record.slug}
              >
                <div dangerouslySetInnerHTML={{ __html: record.svg }} />
                <small>{record.period} · {record.artifactNumber}</small>
                <h3>{record.shortTitle}</h3>
                <span>{record.script} · {record.mode}</span>
                <p>{record.institution}</p>
              </Link>
            ))}
          </div> : null}
        </section>
      ) : (
        <section className={`paper-panel ${styles.empty}`}>
          <h2>这一筛选尚无已核验条目</h2>
          <p>切换时代或书体继续浏览；未完成来源、授权和逐字审校的历史印不会提前发布。</p>
          <button onClick={() => { setEra("全部"); setScript("全部"); }} type="button">查看全部精选印</button>
        </section>
      )}
    </>
  );
}
