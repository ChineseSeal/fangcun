"use client";

import { useState } from "react";
import type { ExplainAnnotation } from "@fangcun/seal-engine";
import { termSeeds } from "@fangcun/knowledge";
import { Icon } from "@/components/design-system/icons";
import { TermPopover } from "@/components/knowledge/term-popover";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./seal-annotation-layer.module.css";

const annotationLabels: Record<ExplainAnnotation["kind"], string> = {
  border: "印边",
  density: "重心与疏密",
  distress: "残损",
  grid: "界格",
  imprint: "印文",
  whitespace: "留白",
};

export function SealAnnotationLayer({
  annotations,
  reconstructionNotice,
  sealName,
  sealSlug,
  svg,
}: {
  annotations: readonly ExplainAnnotation[];
  reconstructionNotice: string;
  sealName: string;
  sealSlug: string;
  svg: string;
}) {
  const [enabledKinds, setEnabledKinds] = useState<Set<ExplainAnnotation["kind"]>>(
    () => new Set(annotations.map((annotation) => annotation.kind)),
  );
  const [focusedKind, setFocusedKind] = useState<ExplainAnnotation["kind"] | null>(null);
  const [layerVisible, setLayerVisible] = useState(true);

  function toggleKind(kind: ExplainAnnotation["kind"]) {
    const next = new Set(enabledKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setEnabledKinds(next);
    trackEvent(eventNames.annotationLayerToggled, {
      annotationKind: kind,
      enabled: next.has(kind),
      sealSlug,
    });
  }

  function toggleLayer() {
    const nextVisible = !layerVisible;
    setLayerVisible(nextVisible);
    trackEvent(eventNames.annotationLayerToggled, {
      annotationKind: "all",
      enabled: nextVisible,
      sealSlug,
    });
  }

  return (
    <section aria-labelledby="annotation-heading" className={styles.root}>
      <header>
        <div>
          <small>ANNOTATION LAYER · ENGINE FACTS</small>
          <h2 id="annotation-heading">章法分析图解层</h2>
          <p>几何由 Seal Engine 的 `annotations[]` 直接输出，界面不反推印面坐标。</p>
        </div>
        <button aria-pressed={layerVisible} className="outline-button" onClick={toggleLayer} type="button">
          <Icon name={layerVisible ? "check" : "add"} />{layerVisible ? "标注已开启" : "开启标注"}
        </button>
      </header>
      <figure className={styles.figure}>
        <div className={styles.canvas}>
          <div aria-label={`${sealName}教学印蜕`} className={styles.impression} dangerouslySetInnerHTML={{ __html: svg }} role="img" />
          {layerVisible ? (
            <svg aria-hidden="true" className={styles.overlay} data-annotation-overlay="true" viewBox="0 0 1000 1000">
              {annotations.map((annotation) => enabledKinds.has(annotation.kind) ? (
                <path
                  className={focusedKind === annotation.kind ? styles.focusedPath : styles.path}
                  d={annotation.path}
                  key={annotation.kind}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null)}
            </svg>
          ) : null}
        </div>
        <figcaption>
          <ol aria-label="印面图注">
            {annotations.map((annotation, index) => {
              const term = termSeeds.find((candidate) => candidate.slug === annotation.termSlug);
              const enabled = enabledKinds.has(annotation.kind);
              return (
                <li
                  className={focusedKind === annotation.kind ? styles.focusedItem : undefined}
                  key={annotation.kind}
                  onBlur={() => setFocusedKind(null)}
                  onFocus={() => setFocusedKind(annotation.kind)}
                  onMouseEnter={() => setFocusedKind(annotation.kind)}
                  onMouseLeave={() => setFocusedKind(null)}
                >
                  <button
                    aria-label={`${enabled ? "隐藏" : "显示"}${annotationLabels[annotation.kind]}标注`}
                    aria-pressed={enabled}
                    className={styles.toggle}
                    onClick={() => toggleKind(annotation.kind)}
                    type="button"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                  <div>
                    <strong><TermPopover slug={annotation.termSlug}>{annotationLabels[annotation.kind]}</TermPopover></strong>
                    <p>{term?.oneLinerZh ?? "由印面结构派生的分析区域。"}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className={styles.notice}>{reconstructionNotice}</p>
        </figcaption>
      </figure>
      <p aria-live="polite" className={styles.status}>
        {layerVisible ? `当前显示 ${enabledKinds.size} / ${annotations.length} 项标注` : "标注层已关闭，图注仍可阅读"}
      </p>
    </section>
  );
}
