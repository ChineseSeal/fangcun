"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { linkTerms, termSeeds } from "@fangcun/knowledge";
import styles from "./term-popover.module.css";

type TermPopoverProps = {
  slug: string;
  children?: ReactNode;
};

export function TermPopover({ slug, children }: TermPopoverProps) {
  const term = termSeeds.find((candidate) => candidate.slug === slug);
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  if (!term) return <>{children ?? slug}</>;

  function clearTimers() {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => {
        clearTimers();
        openTimer.current = window.setTimeout(() => setOpen(true), 300);
      }}
      onMouseLeave={() => {
        clearTimers();
        closeTimer.current = window.setTimeout(() => setOpen(false), 150);
      }}
    >
      <button
        aria-describedby={open ? descriptionId : undefined}
        aria-expanded={open}
        aria-label={`了解术语：${term.nameZh}`}
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        type="button"
      >
        {children ?? term.nameZh}
      </button>
      {open ? (
        <span className={styles.popover} id={descriptionId} role="note">
          <span className={styles.heading}><strong>{term.nameZh}</strong><small>{term.pinyinZh}</small></span>
          <span className={styles.definition}>{term.oneLinerZh}</span>
          <span className={styles.footer}>
            <span aria-hidden="true">{term.nameZh.slice(0, 1)}</span>
            <Link href={term.cta.href}>{term.cta.labelZh} →</Link>
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function TermRichText({ text }: { text: string }) {
  return (
    <>
      {linkTerms(text).map((segment, index) =>
        segment.slug ? (
          <TermPopover key={`${segment.slug}-${index}`} slug={segment.slug}>{segment.text}</TermPopover>
        ) : (
          <span key={`text-${index}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}
