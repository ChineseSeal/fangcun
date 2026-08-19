"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/design-system/icons";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./lesson.module.css";

export function LessonDisplayActions({
  baseHref,
  lessonSlug,
  rootId,
}: {
  baseHref: string;
  lessonSlug: string;
  rootId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPresentation = searchParams.get("present") === "1";

  useEffect(() => {
    const root = document.getElementById(rootId);
    root?.setAttribute("data-lesson-display", isPresentation ? "presentation" : "reading");

    if (!isPresentation) return;
    const exitPresentation = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(baseHref);
    };
    window.addEventListener("keydown", exitPresentation);
    return () => window.removeEventListener("keydown", exitPresentation);
  }, [baseHref, isPresentation, rootId, router]);

  function printHandout() {
    trackEvent(eventNames.lessonHandoutPrinted, { lessonSlug });
    window.print();
  }

  return (
    <div aria-label="课程显示模式" className={styles.displayActions} role="group">
      <Link
        className="quiet-button"
        href={isPresentation ? baseHref : `${baseHref}?present=1`}
        onClick={() => trackEvent(eventNames.lessonDisplayModeChanged, { lessonSlug, mode: isPresentation ? "reading" : "presentation" })}
      >
        <Icon name="fullscreen" />{isPresentation ? "退出投屏" : "投屏模式"}
      </Link>
      <button className="quiet-button" onClick={printHandout} type="button">
        <Icon name="book" />打印讲义
      </button>
    </div>
  );
}
