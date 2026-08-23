import type { Metadata } from "next";
import Link from "next/link";
import { lessonSeeds } from "@fangcun/knowledge/lessons";
import { Icon } from "@/components/design-system/icons";
import { SealImpression } from "@/components/design-system/seal-impression";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { pairedMetadata } from "@/lib/i18n";
import styles from "@/app/(zh)/academy/academy.module.css";

export const metadata: Metadata = pairedMetadata({ title: "Academy | Fangcun", description: "Learn the essential visual language of Chinese seals through five focused studies.", locale: "en", path: "/academy" });

const lessons = [
  { title: "Zhuwen and Baiwen", summary: "Read the two fundamental seal types by comparing positive and negative inscription color.", action: "Compare seal types" },
  { title: "Composition and density", summary: "See how zhangfa organizes characters, negative space, reading order, and borders.", action: "Study composition" },
  { title: "Carving character and impressions", summary: "Separate authoritative glyph geometry from wear, ink variation, and the stamped result.", action: "Study impressions" },
  { title: "Traditional reading order", summary: "Compare traditional right-start placement with modern horizontal order.", action: "Compare reading order" },
  { title: "Seal paste and stamping", summary: "Understand why seal impressions are red and how ink state changes their appearance.", action: "Study seal paste" },
] as const;

export default function EnglishAcademyPage() {
  return <div className="paper-page"><SiteHeader locale="en" /><main className={`page-container ${styles.page}`}>
    <header><p>SEAL CARVING FOUNDATIONS · L0</p><h1>Read a world within one seal.</h1><span>No prior seal-script knowledge is required. Each study starts from a visible comparison and leads directly into the working Studio.</span></header>
    <section className={styles.lessonGrid} aria-label="Introductory seal studies">{lessonSeeds.map((lesson, index) => <article className="paper-panel" key={lesson.slug}><div><div className={styles.lessonMeta}><small>Study {lesson.order} · {lesson.durationMinutes} min</small><span>Available</span></div><h2>{lessons[index]?.title}</h2><p>{lessons[index]?.summary}</p><Link aria-label={`${lessons[index]?.action}: ${lessons[index]?.title}`} href={`/en${lesson.exercise.href}`}>{lessons[index]?.action}<Icon name="arrow" /></Link></div><SealImpression locale="en" mode={index === 2 ? "solid" : "outline"} shape={index === 1 ? "circle" : "square"} text={lesson.sealText} /></article>)}</section>
    <aside className="paper-panel"><Icon name="project" size={28} /><div><strong>Classroom practice and collections</strong><p>Three ready-to-use prompts, plus private invitation-based collections for synchronized final work.</p></div><Link className="outline-button" href="/en/academy/classroom">Open classroom mode</Link></aside>
    <aside className="paper-panel"><Icon name="grid" size={28} /><div><strong>My knowledge map</strong><p>Connect lesson progress, the introductory quiz, and earned mastery marks.</p></div><Link className="outline-button" href="/en/academy/map">Open knowledge map</Link></aside>
    <aside className="paper-panel"><Icon name="book" size={28} /><div><strong>Essential terminology</strong><p>Zhuwen, Baiwen, Han seal, Guxi, zhangfa, seal impression, and side inscription in one compact reference.</p></div><Link className="outline-button" href="/en/dictionary">Open dictionary</Link></aside>
    <aside className="paper-panel"><Icon name="stamp" size={28} /><div><strong>Practice in Studio</strong><p>Every exercise keeps the Seal DSL authoritative while you compare one visible variable at a time.</p></div><Link className="outline-button" href="/en/create">Create a seal</Link></aside>
  </main><SiteFooter locale="en" /></div>;
}
