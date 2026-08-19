"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { QuizAnswerResult, QuizPublicItem, QuizPublicSet } from "@fangcun/knowledge/quizzes";
import { Icon } from "@/components/design-system/icons";
import { recordAchievementEvent } from "@/lib/achievement-store";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./quiz.module.css";

type QuizClientItem = QuizPublicItem & { sealSvg: string };
type QuizClientSet = Omit<QuizPublicSet, "items"> & { items: readonly QuizClientItem[] };
type LearningLink = { label: string; href: string };

function isAnswerResponse(value: unknown): value is { ok: true; result: QuizAnswerResult } {
  if (typeof value !== "object" || value === null || !("ok" in value) || !("result" in value)) return false;
  const response = value as { ok?: unknown; result?: unknown };
  if (response.ok !== true || typeof response.result !== "object" || response.result === null) return false;
  return "questionId" in response.result && "correct" in response.result && "explanationZh" in response.result;
}

export function QuizRunner({
  lessonLinks,
  quiz,
  termLinks,
}: {
  lessonLinks: Record<string, LearningLink>;
  quiz: QuizClientSet;
  termLinks: Record<string, LearningLink>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [results, setResults] = useState<Record<string, QuizAnswerResult>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [showResults, setShowResults] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const started = useRef(false);
  const attemptKey = useRef(`quiz:${quiz.slug}:initial`);
  const current = quiz.items[currentIndex];
  const answer = results[current.id];
  const score = Object.values(results).filter((result) => result.correct).length;

  function chooseOption(optionId: string) {
    if (answer || status === "submitting") return;
    if (!started.current) {
      started.current = true;
      attemptKey.current = `quiz:${quiz.slug}:${Date.now()}`;
      trackEvent(eventNames.quizStarted, { setSlug: quiz.slug, total: quiz.items.length });
    }
    setSelectedOptionId(optionId);
    setStatus("idle");
  }

  async function submitAnswer() {
    if (!selectedOptionId || answer || status === "submitting") return;
    setStatus("submitting");
    try {
      const response = await fetch(`/api/quiz/${quiz.slug}/submit`, {
        body: JSON.stringify({ questionId: current.id, optionId: selectedOptionId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isAnswerResponse(payload)) throw new Error("grade failed");
      setResults((previous) => ({ ...previous, [current.id]: payload.result }));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function continueQuiz() {
    if (!answer) return;
    if (currentIndex === quiz.items.length - 1) {
      setShowResults(true);
      trackEvent(eventNames.quizCompleted, { setSlug: quiz.slug, score, total: quiz.items.length });
      recordAchievementEvent({
        event: "quiz_completed",
        eventKey: attemptKey.current,
        score,
        setSlug: quiz.slug,
        total: quiz.items.length,
      });
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedOptionId("");
    setStatus("idle");
  }

  function restartQuiz() {
    setCurrentIndex(0);
    setSelectedOptionId("");
    setResults({});
    setStatus("idle");
    setShowResults(false);
    setShareStatus("");
    started.current = false;
    attemptKey.current = `quiz:${quiz.slug}:restart:${Date.now()}`;
  }

  async function shareResult() {
    const text = `我在方寸「${quiz.titleZh}」中读懂了 ${score} / ${quiz.items.length} 题。`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `方寸 · ${quiz.titleZh}`, text, url: window.location.href });
        setShareStatus("已打开分享");
      } else if (typeof navigator.clipboard?.writeText === "function") {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        setShareStatus("结果已复制");
      } else {
        throw new Error("share unavailable");
      }
      trackEvent(eventNames.quizShared, { setSlug: quiz.slug, score, total: quiz.items.length });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("暂时无法分享，请稍后重试");
    }
  }

  if (showResults) {
    const incorrectResults = Object.values(results).filter((result) => !result.correct);
    const reviewTerms = Array.from(new Set(incorrectResults.flatMap((result) => result.termSlugs)))
      .map((slug) => termLinks[slug])
      .filter((link): link is LearningLink => Boolean(link));
    const reviewLessons = Array.from(new Set(incorrectResults.flatMap((result) => result.lessonSlugs)))
      .map((slug) => lessonLinks[slug])
      .filter((link): link is LearningLink => Boolean(link));

    return (
      <section aria-labelledby="quiz-result-heading" className={`paper-panel ${styles.result}`}>
        <div className={styles.resultMark} aria-hidden="true"><span>{score}</span><small>/ {quiz.items.length}</small></div>
        <div>
          <p>QUIZ COMPLETE</p>
          <h2 id="quiz-result-heading">五题已读完，留下自己的观察。</h2>
          <span>{score === quiz.items.length ? "五个概念都已辨认出来，可以带着它们继续看印。" : "分数只是一次观察记录；下面是可以再看一眼的知识点。"}</span>
        </div>
        {incorrectResults.length > 0 ? (
          <section className={styles.review} aria-labelledby="review-heading">
            <h3 id="review-heading">再看一眼</h3>
            <div>
              {reviewTerms.map((link) => <Link href={link.href} key={link.href}>{link.label}<Icon name="arrow" size={12} /></Link>)}
              {reviewLessons.map((link) => <Link href={link.href} key={link.href}>{link.label}<Icon name="arrow" size={12} /></Link>)}
            </div>
          </section>
        ) : (
          <section className={styles.review}><h3>继续读印</h3><div><Link href="/seals/ying-qu">查看“应衢”章法图解 <Icon name="arrow" size={12} /></Link></div></section>
        )}
        <div className={styles.resultActions}>
          <button className="primary-button" onClick={shareResult} type="button"><Icon name="send" size={15} /> 分享结果</button>
          <button className="outline-button" onClick={restartQuiz} type="button"><Icon name="refresh" size={15} /> 重新练习</button>
        </div>
        <p aria-live="polite" className={styles.shareStatus}>{shareStatus}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="quiz-question-heading" className={`paper-panel ${styles.runner}`} data-testid="quiz-runner">
      <header className={styles.progressHeader}>
        <span>第 {currentIndex + 1} / {quiz.items.length} 题</span>
        <div aria-hidden="true" className={styles.progressTrack}><i style={{ width: `${((currentIndex + 1) / quiz.items.length) * 100}%` }} /></div>
        <small>{current.kind === "mode" ? "识别印式" : current.kind === "reading-order" ? "判断读序" : current.kind === "layout" ? "观察结构" : "辨认章法"}</small>
      </header>
      <div className={styles.questionGrid}>
        <figure aria-label="本题教学印蜕" className={styles.sealStage}>
          <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: current.sealSvg }} />
          <figcaption>Seal Engine · 确定性教学图例</figcaption>
        </figure>
        <div className={styles.questionBody}>
          <p>OBSERVE FIRST</p>
          <h2 id="quiz-question-heading">{current.promptZh}</h2>
          <fieldset disabled={Boolean(answer) || status === "submitting"}>
            <legend className="sr-only">请选择一个答案</legend>
            {current.options.map((option, index) => (
              <label className={selectedOptionId === option.id ? styles.optionSelected : undefined} key={option.id}>
                <input checked={selectedOptionId === option.id} name={current.id} onChange={() => chooseOption(option.id)} type="radio" value={option.id} />
                <span>{String.fromCharCode(65 + index)}</span>
                <strong>{option.labelZh}</strong>
              </label>
            ))}
          </fieldset>
          {!answer ? (
            <div className={styles.submitRow}>
              <button className="primary-button" disabled={!selectedOptionId || status === "submitting"} onClick={submitAnswer} type="button">
                {status === "submitting" ? "正在判题…" : "确认答案"}
              </button>
              <p aria-live="polite">{status === "error" ? "判题暂时不可用，请重试。" : "作答后立即查看解析"}</p>
            </div>
          ) : (
            <aside aria-live="polite" className={styles.feedback} data-correct={String(answer.correct)} role="status">
              <div><Icon name={answer.correct ? "check" : "search"} size={20} /><strong>{answer.correct ? "看懂了" : "再看一眼"}</strong></div>
              <p>{answer.explanationZh}</p>
              {!answer.correct && <small>正确选项：{current.options.find((option) => option.id === answer.correctOptionId)?.labelZh}</small>}
              <button className="outline-button" onClick={continueQuiz} type="button">
                {currentIndex === quiz.items.length - 1 ? "查看结果" : "下一题"}<Icon name="arrow" size={13} />
              </button>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
