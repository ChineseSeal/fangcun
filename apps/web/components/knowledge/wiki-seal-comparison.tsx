"use client";

import { useEffect, useRef, useState } from "react";
import type { SealDsl } from "@fangcun/dsl-schema";
import { ProjectPreview } from "@/components/projects/project-preview";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./wiki-seal-comparison.module.css";

export type WikiSealComparisonItem = {
  labelZh: string;
  captionZh: string;
  dsl: SealDsl;
};

export function WikiSealComparison({
  examples,
  termCategory,
  termName,
  termSlug,
}: {
  examples: readonly [WikiSealComparisonItem, WikiSealComparisonItem];
  termCategory: string;
  termName: string;
  termSlug: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const viewTracked = useRef(false);
  const selected = examples[selectedIndex];

  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    trackEvent(eventNames.wikiEntryViewed, { category: termCategory, termSlug });
  }, [termCategory, termSlug]);

  return (
    <section aria-labelledby="wiki-example-heading" className={styles.root}>
      <header>
        <div>
          <small>SEAL DSL · 实时图例</small>
          <h2 id="wiki-example-heading">从印蜕观察「{termName}」</h2>
        </div>
        <div aria-label="切换对照图例" className={styles.tabs} role="group">
          {examples.map((item, index) => (
            <button
              aria-pressed={selectedIndex === index}
              className={selectedIndex === index ? styles.selected : undefined}
              key={item.labelZh}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              {item.labelZh}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.stage}>
        <ProjectPreview dsl={selected.dsl} />
      </div>
      <footer aria-live="polite">
        <strong>{selected.labelZh}</strong>
        <p>{selected.captionZh}</p>
        <dl>
          <div><dt>印式</dt><dd>{selected.dsl.mode === "yin" ? "白文" : "朱文"}</dd></div>
          <div><dt>文字</dt><dd>{selected.dsl.script.replace("han_seal", "汉印篆").replace("xiaozhuan", "小篆").replace("guxi", "古玺")}</dd></div>
          <div><dt>种子</dt><dd>{selected.dsl.impression.seed}</dd></div>
        </dl>
      </footer>
    </section>
  );
}
