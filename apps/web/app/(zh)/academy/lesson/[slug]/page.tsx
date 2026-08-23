import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findLesson, lessonSeeds } from "@fangcun/knowledge/lessons";
import { Icon } from "@/components/design-system/icons";
import { SealImpression } from "@/components/design-system/seal-impression";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { LessonActions } from "./lesson-actions";
import { findLessonContent } from "./lesson-content";
import { LessonDisplayActions } from "./lesson-display-actions";
import styles from "./lesson.module.css";

type LessonRouteProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return lessonSeeds.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: LessonRouteProps): Promise<Metadata> {
  const lesson = findLesson((await params).slug);
  return lesson ? { title: `${lesson.title}｜方寸篆刻学院`, description: lesson.summary } : {};
}

export default async function LessonPage({ params }: LessonRouteProps) {
  const lesson = findLesson((await params).slug);
  if (!lesson) notFound();
  const LessonContent = findLessonContent(lesson.slug);
  if (!LessonContent) notFound();
  const previous = lessonSeeds[lesson.order - 2];
  const next = lessonSeeds[lesson.order];
  const baseHref = `/academy/lesson/${lesson.slug}`;
  const rootId = `lesson-${lesson.slug}`;

  return (
    <div className={`paper-page ${styles.pageRoot}`} data-lesson-display="reading" data-testid="lesson-page" id={rootId}>
      <div className={styles.screenChrome}><SiteHeader /></div>
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="课程路径" className={styles.breadcrumb}><Link href="/academy">篆刻学院</Link><span>›</span><span>L0 第 {lesson.order} 课</span></nav>
        <Suspense fallback={<div className={styles.displayActionsPlaceholder} />}>
          <LessonDisplayActions baseHref={baseHref} lessonSlug={lesson.slug} rootId={rootId} />
        </Suspense>
        <header className={styles.hero}>
          <div><p>L0 入门 · 第 {lesson.order}/{lessonSeeds.length} 课 · {lesson.durationMinutes} 分钟</p><h1>{lesson.title}</h1><span>{lesson.summary}</span></div>
          <SealImpression mode={lesson.order === 3 ? "solid" : "outline"} shape={lesson.order === 2 ? "circle" : "square"} text={lesson.sealText} />
        </header>
        <article className={`paper-panel ${styles.article}`}>
          <section className={styles.answer} aria-labelledby="one-line-answer">
            <small>一句话答案</small>
            <h2 id="one-line-answer">{lesson.oneLineAnswer}</h2>
          </section>
          <div className={styles.mdx}><LessonContent /></div>
          <aside>
            <Icon name="feather" size={24} />
            <div><strong>动手试一试</strong><p>带着这一课的参数进入生成器，观察印面如何变化。</p></div>
            <LessonActions exercise={lesson.exercise} lessonOrder={lesson.order} lessonSlug={lesson.slug} />
          </aside>
        </article>
        <footer className={styles.lessonNav}>
          {previous ? <Link href={`/academy/lesson/${previous.slug}`}>← {previous.title}</Link> : <span />}
          {next ? <Link href={`/academy/lesson/${next.slug}`}>{next.title} →</Link> : <Link href="/academy/quiz/intro">完成入门小测 →</Link>}
        </footer>
      </main>
      <div className={styles.screenChrome}><SiteFooter /></div>
    </div>
  );
}
