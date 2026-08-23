"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { eventNames, trackEvent } from "@/lib/events";
import {
  markLessonCompleted,
  markLessonStarted,
  readLearningProgress,
  writeLearningProgress,
  type LessonProgressStatus,
} from "@/lib/learning-progress";
import styles from "./lesson.module.css";

type LessonActionsProps = {
  exercise: { label: string; href: string };
  lessonOrder: number;
  lessonSlug: string;
};

export function LessonActions({ exercise, lessonOrder, lessonSlug }: LessonActionsProps) {
  const [lessonStatus, setLessonStatus] = useState<LessonProgressStatus | "new">("new");
  const [statusMessage, setStatusMessage] = useState("学习进度会保存在当前设备。");

  useEffect(() => {
    const current = readLearningProgress(window.localStorage);
    const next = markLessonStarted(current, lessonSlug, new Date().toISOString());
    if (next !== current) {
      const saved = writeLearningProgress(window.localStorage, next);
      trackEvent(eventNames.lessonStarted, { lessonSlug, lessonOrder });
      if (!saved) setStatusMessage("本课已开始，但浏览器未能保存进度。");
    }
    setLessonStatus(next.lessons[lessonSlug]?.status ?? "new");
  }, [lessonOrder, lessonSlug]);

  function completeLesson() {
    const current = readLearningProgress(window.localStorage);
    const next = markLessonCompleted(current, lessonSlug, new Date().toISOString());
    const saved = writeLearningProgress(window.localStorage, next);
    if (next !== current) {
      trackEvent(eventNames.lessonCompleted, { lessonSlug, lessonOrder });
    }
    setLessonStatus("completed");
    setStatusMessage(saved
      ? "已完成本课，学习进度已保存在当前设备。"
      : "本次已完成，但浏览器未能保存进度。");
  }

  function trackPractice() {
    trackEvent(eventNames.lessonPracticeClicked, { lessonSlug, lessonOrder });
  }

  return (
    <div className={styles.lessonActions}>
      <Link className="primary-button" href={exercise.href} onClick={trackPractice}>
        {exercise.label}<Icon name="arrow" />
      </Link>
      <button
        className={`outline-button ${styles.completionButton}`}
        disabled={lessonStatus === "completed"}
        onClick={completeLesson}
        type="button"
      >
        <Icon name="check" />{lessonStatus === "completed" ? "本课已完成" : "标记本课完成"}
      </button>
      <p className={styles.progressStatus} aria-live="polite">{statusMessage}</p>
    </div>
  );
}
