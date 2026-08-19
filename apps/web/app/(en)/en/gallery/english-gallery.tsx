"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { SealImpression } from "@/components/design-system/seal-impression";
import styles from "@/app/(zh)/gallery/gallery.module.css";

const works = [
  { title: "Clear breeze, bright moon", author: "Ink Pond Studio", text: "清风明月", likes: "128", category: "Literati" },
  { title: "Contentment", author: "Grain Rain", text: "知足常乐", likes: "96", category: "Leisure" },
  { title: "Quiet purpose", author: "Cloud Seal", text: "宁静致远", likes: "76", category: "Literati" },
  { title: "Self-discipline", author: "South Hill Studio", text: "慎独", likes: "62", category: "Name" },
  { title: "Learn from the worthy", author: "One Inkstone Field", text: "见贤思齐", likes: "55", category: "Leisure" },
  { title: "Keep the first intention", author: "Lamplight Studio", text: "不忘初心", likes: "48", category: "Literati" },
  { title: "Open as a valley", author: "Clear Ink", text: "虚怀若谷", likes: "41", category: "Guxi" },
  { title: "Tea at leisure", author: "Half-day Idle", text: "得闲饮茶", likes: "38", category: "Leisure" },
] as const;
const tabs = ["Latest", "Popular", "Literati", "Name", "Leisure", "Guxi"] as const;

export function EnglishGallery() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Latest");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const visible = useMemo(() => works.filter((work) => (tab === "Latest" || tab === "Popular" || work.category === tab) && `${work.title} ${work.author} ${work.text}`.toLowerCase().includes(query.toLowerCase())), [query, tab]);
  return <main className={`page-container ${styles.page}`}>
    <header className={styles.heading}><div><h1>Gallery <i>/</i> Community seals</h1><p>Study shared seal impressions and open their inscriptions in Create.</p></div><div className={styles.search}><label><Icon name="search" /><input aria-label="Search works, makers, or inscriptions" onChange={(event) => setQuery(event.target.value)} placeholder="Search works or makers" value={query} /></label><button type="button">Latest first <Icon name="chevron" size={15} /></button><div className={styles.viewToggle} role="group" aria-label="Gallery view"><button aria-label="Grid view" aria-pressed={view === "grid"} className="icon-button" onClick={() => setView("grid")} type="button"><Icon name="grid" /></button><button aria-label="List view" aria-pressed={view === "list"} className="icon-button" onClick={() => setView("list")} type="button"><Icon name="list" /></button></div></div></header>
    <div className={styles.tabs}>{tabs.map((item) => <button className={tab === item ? styles.tabActive : styles.tab} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div>
    <div className={styles.layout}><section aria-label={`${visible.length} gallery works`} className={view === "grid" ? styles.workGrid : styles.workList}>{visible.map((work, index) => <article className={styles.workCard} key={work.title}><SealImpression locale="en" mode={index === 3 ? "black" : index % 6 === 1 ? "solid" : "outline"} shape={index % 4 === 1 ? "circle" : index % 4 === 3 ? "tall" : "square"} text={work.text} /><h2>{work.title}</h2><p><span className={styles.smallAvatar}>{work.author.slice(0, 1)}</span>{work.author}</p><footer><button aria-label={`Like ${work.title}`} type="button"><Icon name="heart" size={16} />{work.likes}</button><button aria-label={`Save ${work.title}`} className="icon-button" type="button"><Icon name="bookmark" size={16} /></button><Link href={`/en/create?text=${encodeURIComponent(work.text)}`}><Icon name="stamp" size={16} />Remix</Link></footer></article>)}</section>
      <aside className={styles.sidebar}><section className="paper-panel"><h2>Featured maker</h2><div className={styles.creator}><span>I</span><div><strong>Ink Pond Studio <i>MAKER</i></strong><p>Literati and personal seals</p></div></div><dl><div><dt>Works</dt><dd>128</dd></div><div><dt>Followers</dt><dd>1.2k</dd></div><div><dt>Likes</dt><dd>8.6k</dd></div></dl><button className="outline-button" type="button">View profile</button></section><section className="paper-panel"><h2>About this gallery</h2><p>Community records are presentation examples. Historic claims belong in the source-reviewed Archive, while every remix starts a new Seal DSL rather than copying artifact geometry.</p><Link className={styles.more} href="/en/seals">Open the Archive <Icon name="arrow" /></Link></section></aside>
    </div>
  </main>;
}
