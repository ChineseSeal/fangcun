"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { lessonSeeds } from "@fangcun/knowledge/lessons";
import { Icon } from "@/components/design-system/icons";
import { SealImpression } from "@/components/design-system/seal-impression";
import {
  countCompletedLessons,
  createEmptyLearningProgress,
  findNextLessonSlug,
  learningProgressStorageKey,
  readLearningProgress,
  type LearningProgress,
  type LessonProgressStatus,
} from "@/lib/learning-progress";
import styles from "./academy.module.css";

const lessonSlugs = lessonSeeds.map((lesson) => lesson.slug);

function actionLabel(status?: LessonProgressStatus): string {
  if (status === "completed") return "已完成 · 再看一遍";
  if (status === "started") return "继续学习";
  return "开始学习";
}

function statusLabel(status?: LessonProgressStatus): string {
  if (status === "completed") return "已完成";
  if (status === "started") return "学习中";
  return "未开始";
}

export function AcademyLessonList() {
  const [progress, setProgress] = useState<LearningProgress>(createEmptyLearningProgress);

  useEffect(() => {
    const syncProgress = () => setProgress(readLearningProgress(window.localStorage));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === learningProgressStorageKey) syncProgress();
    };
    syncProgress();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const completedCount = countCompletedLessons(progress, lessonSlugs);
  const nextSlug = findNextLessonSlug(progress, lessonSlugs) ?? lessonSlugs[0];
  const nextLesson = lessonSeeds.find((lesson) => lesson.slug === nextSlug) ?? lessonSeeds[0];
  const hasProgress = Object.keys(progress.lessons).length > 0;
  const overviewAction = completedCount === lessonSeeds.length
    ? "复习第一课"
    : hasProgress
      ? "继续学习"
      : "从第一课开始";

  return (
    <>
      <section className={`paper-panel ${styles.progressPanel}`} aria-labelledby="learning-progress-title">
        <div>
          <small id="learning-progress-title">你的学习进度</small>
          <strong>{completedCount} / {lessonSeeds.length} 课已完成</strong>
          <span>进度仅保存在当前设备，登录同步将在 V1 提供。</span>
        </div>
        <progress aria-label={`L0 学习进度：已完成 ${completedCount} / ${lessonSeeds.length} 课`} max={lessonSeeds.length} value={completedCount} />
        <Link className="outline-button" href={`/academy/lesson/${nextLesson.slug}`}>
          {overviewAction}<Icon name="arrow" />
        </Link>
      </section>

      <section className={styles.lessonGrid} aria-label="L0 入门课程">
        {lessonSeeds.map((lesson, order) => {
          const status = progress.lessons[lesson.slug]?.status;
          const action = actionLabel(status);
          return (
            <article className={`paper-panel ${status === "completed" ? styles.lessonCompleted : ""}`} key={lesson.slug}>
              <div>
                <div className={styles.lessonMeta}>
                  <small>第{lesson.order}课 · {lesson.durationMinutes} 分钟</small>
                  <span data-status={status ?? "new"}>{statusLabel(status)}</span>
                </div>
                <h2>{lesson.title}</h2>
                <p>{lesson.summary}</p>
                <Link aria-label={`${action}：${lesson.title}`} href={`/academy/lesson/${lesson.slug}`}>
                  {action}<Icon name="arrow" />
                </Link>
              </div>
              <SealImpression mode={order === 2 ? "solid" : "outline"} shape={order === 1 ? "circle" : "square"} text={lesson.sealText} />
            </article>
          );
        })}
      </section>
    </>
  );
}
