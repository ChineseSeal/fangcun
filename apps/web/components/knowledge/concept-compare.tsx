"use client";

import { useId, useState } from "react";
import styles from "./concept-compare.module.css";

type CompareSide = {
  description: string;
  label: string;
  svg: string;
};

function StaticPair({ left, right }: { left: CompareSide; right: CompareSide }) {
  return (
    <div className={styles.staticPair}>
      {[left, right].map((side) => (
        <figure key={side.label}>
          <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: side.svg }} />
          <figcaption><strong>{side.label}</strong><span>{side.description}</span></figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ConceptCompare({
  eyebrow,
  left,
  right,
  title,
}: {
  eyebrow: string;
  left: CompareSide;
  right: CompareSide;
  title: string;
}) {
  const descriptionId = useId();
  const [position, setPosition] = useState(50);

  return (
    <section aria-labelledby={`${descriptionId}-heading`} className={styles.root}>
      <header>
        <small>{eyebrow}</small>
        <h2 id={`${descriptionId}-heading`}>{title}</h2>
        <p id={descriptionId}>两侧使用相同文字、尺寸与布局，只改变正在解释的变量。</p>
      </header>
      <div className={styles.interactive}>
        <div aria-hidden="true" className={styles.splitStage}>
          <div className={styles.leftSvg} dangerouslySetInnerHTML={{ __html: left.svg }} />
          <div className={styles.rightSvg} dangerouslySetInnerHTML={{ __html: right.svg }} style={{ clipPath: `inset(0 0 0 ${position}%)` }} />
          <i style={{ left: `${position}%` }} />
        </div>
        <input
          aria-describedby={descriptionId}
          aria-label={`${left.label}与${right.label}对比分割线`}
          max="100"
          min="0"
          onChange={(event) => setPosition(Number(event.target.value))}
          type="range"
          value={position}
        />
        <div className={styles.labels}><span><strong>{left.label}</strong>{left.description}</span><span><strong>{right.label}</strong>{right.description}</span></div>
      </div>
      <StaticPair left={left} right={right} />
      <noscript><StaticPair left={left} right={right} /></noscript>
    </section>
  );
}
