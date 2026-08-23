import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { lessonSeeds } from "@fangcun/knowledge/lessons";
import { quizSetSlugs, findQuizSet, toPublicQuizSet } from "@fangcun/knowledge/quizzes/server";
import { wikiEntries } from "@fangcun/knowledge/wiki";
import { renderSeal } from "@fangcun/seal-engine";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { QuizRunner } from "./quiz-runner";
import styles from "./quiz.module.css";

type QuizPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return quizSetSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const set = findQuizSet((await params).slug);
  return set ? {
    title: `${set.titleZh}｜方寸识印小测`,
    description: set.summaryZh,
  } : {};
}

async function renderQuizSeal(text: string, dsl: unknown): Promise<string> {
  const catalog = await loadGlyphCatalogForText(text);
  const rendered = renderSeal(dsl, catalog);
  if (!rendered.ok) throw new Error(`Quiz seal DSL failed: ${rendered.errors.map((error) => error.code).join(",")}`);
  return rendered.svg;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const set = findQuizSet((await params).slug);
  if (!set) notFound();

  const publicSet = toPublicQuizSet(set);
  const sealSvgs = await Promise.all(
    publicSet.items.map((item) => renderQuizSeal(item.visualDsl.text, item.visualDsl)),
  );
  const termLinks = Object.fromEntries(
    wikiEntries.map((entry) => [entry.slug, { label: entry.nameZh, href: `/academy/wiki/${entry.slug}` }]),
  );
  const lessonLinks = Object.fromEntries(
    lessonSeeds.map((lesson) => [lesson.slug, { label: lesson.title, href: `/academy/lesson/${lesson.slug}` }]),
  );

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="小测路径"><Link href="/academy">篆刻学院</Link><span>›</span><span>{publicSet.titleZh}</span></nav>
        <header className={styles.hero}>
          <div>
            <p>QUIZ · K5</p>
            <h1>{publicSet.titleZh}</h1>
            <span>{publicSet.summaryZh}</span>
          </div>
          <dl>
            <div><dt>题量</dt><dd>{publicSet.items.length} 题</dd></div>
            <div><dt>用时</dt><dd>约 {publicSet.durationMinutes} 分钟</dd></div>
            <div><dt>方式</dt><dd>逐题解析</dd></div>
          </dl>
        </header>
        <QuizRunner
          lessonLinks={lessonLinks}
          quiz={{ ...publicSet, items: publicSet.items.map((item, index) => ({ ...item, sealSvg: sealSvgs[index] })) }}
          termLinks={termLinks}
        />
        <aside className={styles.promise}>
          <strong>轻松自测，不作排名</strong>
          <p>没有倒计时、排行榜或失败记录。每题作答后立即给出解释，也可以随时重新练习。</p>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
