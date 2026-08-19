"use client";

import { knowledgeMapNodes, evaluateKnowledgeMap, type KnowledgeMapEvidence, type KnowledgeMapEntry } from "@fangcun/knowledge/knowledge-map";
import { termSeeds } from "@fangcun/knowledge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SealImpression } from "@/components/design-system/seal-impression";
import { Icon } from "@/components/design-system/icons";
import { ACHIEVEMENT_EARNED_EVENT, readAchievementState } from "@/lib/achievement-store";
import { learningProgressStorageKey, readLearningProgress } from "@/lib/learning-progress";
import { achievementDefinitions } from "@fangcun/knowledge/achievements";
import type { Locale } from "@/lib/i18n";
import styles from "./knowledge-map-view.module.css";

const termBySlug = new Map(termSeeds.map((term) => [term.slug, term]));
const achievementByCode = new Map(achievementDefinitions.map((definition) => [definition.code, definition]));

function readEvidence(): KnowledgeMapEvidence {
  const learning = readLearningProgress(window.localStorage);
  const achievements = readAchievementState(window.localStorage);
  const startedLessonSlugs = Object.entries(learning.lessons)
    .filter(([, entry]) => entry.status === "started" || entry.status === "completed")
    .map(([slug]) => slug);
  const completedLessonSlugs = Object.entries(learning.lessons)
    .filter(([, entry]) => entry.status === "completed")
    .map(([slug]) => slug);
  return {
    startedLessonSlugs,
    completedLessonSlugs,
    earnedAchievementCodes: Object.values(achievements.earned).map((achievement) => achievement.code),
  };
}

function statusCopy(locale: Locale, entry: KnowledgeMapEntry): { label: string; action: string } {
  if (locale === "en") {
    if (entry.node.kind === "quiz") return entry.status === "mastered"
      ? { label: "Mastered", action: "Retake quiz" }
      : { label: entry.status === "learning" ? "In progress" : "Ready to explore", action: "Take quiz" };
    return entry.status === "mastered"
      ? { label: "Mastered", action: "Review lesson" }
      : { label: entry.status === "learning" ? "In progress" : "Ready to explore", action: entry.status === "learning" ? "Continue lesson" : "Open lesson" };
  }
  if (entry.node.kind === "quiz") return entry.status === "mastered"
    ? { label: "已掌握", action: "再做一次小测" }
    : { label: entry.status === "learning" ? "进行中" : "待探索", action: "开始小测" };
  return entry.status === "mastered"
    ? { label: "已掌握", action: "复习本课" }
    : { label: entry.status === "learning" ? "学习中" : "待探索", action: entry.status === "learning" ? "继续学习" : "开始学习" };
}

function nodeHref(locale: Locale, entry: KnowledgeMapEntry): string {
  if (locale === "en") return "/en/academy";
  if (entry.node.kind === "quiz" && entry.node.quizSlug) return `/academy/quiz/${entry.node.quizSlug}`;
  return entry.node.lessonSlug ? `/academy/lesson/${entry.node.lessonSlug}` : "/academy";
}

export function KnowledgeMapView({ locale = "zh-Hans" }: { locale?: Locale }) {
  const [evidence, setEvidence] = useState<KnowledgeMapEvidence>({
    startedLessonSlugs: [],
    completedLessonSlugs: [],
    earnedAchievementCodes: [],
  });

  useEffect(() => {
    const refresh = () => setEvidence(readEvidence());
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === learningProgressStorageKey || event.key === "fangcun:achievements:v1") refresh();
    };
    refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(ACHIEVEMENT_EARNED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(ACHIEVEMENT_EARNED_EVENT, refresh);
    };
  }, []);

  const entries = evaluateKnowledgeMap(knowledgeMapNodes, evidence);
  const masteredCount = entries.filter((entry) => entry.status === "mastered").length;
  const learningCount = entries.filter((entry) => entry.status === "learning").length;
  const earnedAchievements = evidence.earnedAchievementCodes
    .map((code) => achievementByCode.get(code))
    .filter((definition): definition is (typeof achievementDefinitions)[number] => Boolean(definition));
  const progressLabel = locale === "en"
    ? `${masteredCount} of ${entries.length} map points mastered`
    : `已掌握 ${masteredCount} / ${entries.length} 个知识节点`;

  return (
    <section className={styles.shell} aria-label={locale === "en" ? "Personal knowledge map" : "个人知识地图"} data-testid="knowledge-map">
      <header className={styles.overview}>
        <div>
          <small>{locale === "en" ? "KNOWLEDGE MAP · K5 / K6" : "KNOWLEDGE MAP · K5 / K6"}</small>
          <h2>{locale === "en" ? "See what you have understood." : "看见自己已经读懂的部分。"}</h2>
          <p>{locale === "en" ? "The map combines lesson progress and mastery marks. Unvisited topics stay open; failed attempts are never stored." : "地图聚合课程进度与掌握印记。没有访问过的主题会保持开放，错题不会被保存。"}</p>
        </div>
        <div className={styles.progressSummary}>
          <strong>{progressLabel}</strong>
          <progress aria-label={progressLabel} max={entries.length} value={masteredCount} />
          <span>{locale === "en" ? `${learningCount} in progress · ${earnedAchievements.length} marks earned` : `${learningCount} 个学习中 · 已获得 ${earnedAchievements.length} 枚印记`}</span>
        </div>
      </header>

      <ol className={styles.map} aria-label={locale === "en" ? "Learning sequence" : "学习顺序"}>
        {entries.map((entry) => {
          const copy = statusCopy(locale, entry);
          const isMastered = entry.status === "mastered";
          const statusIcon = isMastered ? "check" : entry.status === "learning" ? "book" : "search";
          return (
            <li className={styles.mapItem} data-status={entry.status} key={entry.node.id}>
              <span aria-hidden="true" className={styles.step}>{String(entry.node.order).padStart(2, "0")}</span>
              <article className={`paper-panel ${styles.node}`}>
                <div className={styles.nodeSeal}>
                  <SealImpression locale={locale} mode={isMastered ? "solid" : "outline"} shape={entry.node.kind === "quiz" ? "circle" : "square"} text={entry.node.sealText} />
                </div>
                <div className={styles.nodeBody}>
                  <header>
                    <span className={styles.status} data-status={entry.status}><Icon name={statusIcon} size={13} />{copy.label}</span>
                    <small>{entry.node.kind === "quiz" ? (locale === "en" ? "5 questions" : "5 题") : (locale === "en" ? `Lesson ${entry.node.order}` : `第 ${entry.node.order} 课`)}</small>
                  </header>
                  <h3>{locale === "en" ? entry.node.titleEn : entry.node.titleZh}</h3>
                  <p>{locale === "en" ? entry.node.summaryEn : entry.node.summaryZh}</p>
                  <div className={styles.nodeFooter}>
                    <div className={styles.terms} aria-label={locale === "en" ? "Related terms" : "关联术语"}>
                      {entry.node.termSlugs.map((slug) => {
                        const term = termBySlug.get(slug);
                        if (!term) return null;
                        return <Link href={locale === "en" ? "/en/dictionary" : `/academy/wiki/${slug}`} key={slug}><span lang="zh-Hans">{term.nameZh}</span></Link>;
                      })}
                    </div>
                    <Link className="outline-button" href={nodeHref(locale, entry)}>{copy.action}<Icon name="arrow" size={13} /></Link>
                  </div>
                </div>
                <div className={styles.evidence}>
                  <span><Icon name={statusIcon} size={12} />{entry.satisfiedEvidenceCount} / {entry.totalEvidenceCount}</span>
                  <small>{locale === "en" ? "evidence" : "已满足条件"}</small>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      <footer className={styles.footer}>
        <div>
          <small>{locale === "en" ? "KEEP EXPLORING" : "继续探索"}</small>
          <p>{locale === "en" ? "Open the encyclopedia for the terms attached to each point, or return to the academy when you want a guided next step." : "从每个节点旁的术语进入百科；需要下一步引导时，回到学院继续学习。"}</p>
        </div>
        <Link className="outline-button" href={locale === "en" ? "/en/dictionary" : "/academy/wiki"}>{locale === "en" ? "Open dictionary" : "打开印章小百科"}<Icon name="arrow" size={13} /></Link>
      </footer>
    </section>
  );
}
