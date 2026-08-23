"use client";

import { useId, useState } from "react";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./lesson-interactive.module.css";

export type RenderedLessonVariant = {
  id: string;
  labelZh: string;
  descriptionZh: string;
  svg: string;
};

export function LessonInteractiveClient({
  controlLabelZh,
  descriptionZh,
  eyebrow,
  lessonSlug,
  titleZh,
  variants,
}: {
  controlLabelZh: string;
  descriptionZh: string;
  eyebrow: string;
  lessonSlug: string;
  titleZh: string;
  variants: readonly RenderedLessonVariant[];
}) {
  const headingId = useId();
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  if (!selected) return null;

  function selectVariant(variantId: string) {
    setSelectedId(variantId);
    trackEvent(eventNames.lessonDiagramChanged, { lessonSlug, variantId });
  }

  return (
    <section aria-labelledby={headingId} className={styles.root}>
      <header>
        <div><small>{eyebrow}</small><h2 id={headingId}>{titleZh}</h2></div>
        <p>{descriptionZh}</p>
      </header>
      <div className={styles.body}>
        <figure>
          <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: selected.svg }} />
          <figcaption aria-live="polite"><strong>{selected.labelZh}</strong><span>{selected.descriptionZh}</span></figcaption>
        </figure>
        <div aria-label={controlLabelZh} className={styles.controls} role="group">
          {variants.map((variant, index) => (
            <button
              aria-pressed={variant.id === selected.id}
              className={variant.id === selected.id ? styles.selected : undefined}
              key={variant.id}
              onClick={() => selectVariant(variant.id)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{variant.labelZh}</strong>
              <small>{variant.descriptionZh}</small>
            </button>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={styles.printFallback} data-testid="lesson-print-variants">
        {variants.map((variant) => (
          <figure key={variant.id}>
            <div dangerouslySetInnerHTML={{ __html: variant.svg }} />
            <figcaption><strong>{variant.labelZh}</strong><span>{variant.descriptionZh}</span></figcaption>
          </figure>
        ))}
      </div>
      <noscript>
        <div className={styles.staticFallback}>
          {variants.map((variant) => <figure key={variant.id}><div dangerouslySetInnerHTML={{ __html: variant.svg }} /><figcaption>{variant.labelZh} · {variant.descriptionZh}</figcaption></figure>)}
        </div>
      </noscript>
    </section>
  );
}
