"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { ProjectPreview } from "@/components/projects/project-preview";
import { getGalleryCollectionDetail, type GalleryCollectionDetail } from "@/lib/gallery-store";
import { isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import { galleryPracticeHref } from "@/lib/gallery-practice-href";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "@/app/(zh)/gallery/gallery.module.css";

export function GalleryCollectionPage({ collectionId, locale = "zh-Hans" }: { collectionId: string; locale?: Locale }) {
  const english = isEnglish(locale);
  const [detail, setDetail] = useState<GalleryCollectionDetail | null>(null);
  const [status, setStatus] = useState(english ? "Loading collection…" : "正在读取合集…");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus(english ? "Collections need the configured public gallery service." : "合集需要配置公开作品服务后才能查看。");
      return;
    }
    let active = true;
    void getGalleryCollectionDetail(client, collectionId)
      .then((nextDetail) => {
        if (!active) return;
        setDetail(nextDetail);
        setStatus("");
      })
      .catch(() => {
        if (active) setStatus(english ? "This collection is unavailable or private." : "此合集不存在、暂不可用或仅对创建者可见。");
      });
    return () => { active = false; };
  }, [collectionId, english]);

  const visibility = useMemo(() => {
    if (!detail) return "";
    return detail.collection.visibility === "public" ? (english ? "Public collection" : "公开合集") : (english ? "Private collection" : "私人合集");
  }, [detail, english]);

  return <main className={`page-container ${styles.collectionPage}`}>
    <nav aria-label={english ? "Collection path" : "合集路径"} className={styles.collectionBreadcrumb}><Link href={localizeHref("/gallery", locale)}>{english ? "Gallery" : "用户印谱"}</Link><span>›</span><span>{detail?.collection.title ?? (english ? "Collection" : "合集")}</span></nav>
    {detail ? <>
      <header className={styles.collectionHero}>
        <div>
          <p>{visibility.toUpperCase()} · REFERENCE INDEX</p>
          <h1>{detail.collection.title}</h1>
          <p>{detail.collection.description ?? (english ? "A deliberate set of references to reviewed public works." : "一组有意编排的已审核公开作品引用。")}</p>
        </div>
        <dl>
          <div><dt>{english ? "Works" : "作品"}</dt><dd>{detail.posts.length}</dd></div>
          <div><dt>{english ? "Storage" : "存储方式"}</dt><dd>{english ? "References" : "引用"}</dd></div>
          <div><dt>{english ? "Ranking" : "排序"}</dt><dd>{english ? "None" : "无"}</dd></div>
        </dl>
      </header>
      <p className={styles.collectionNotice}>{english ? "This collection does not copy a Seal DSL or change its source. Each item remains the reviewed snapshot published by its creator." : "合集不复制 Seal DSL，也不改变来源；每枚作品始终是创作者发布并审核通过的原始快照。"}</p>
      <section aria-label={english ? `${detail.posts.length} referenced works` : `${detail.posts.length} 枚引用作品`} className={styles.collectionGrid}>
        {detail.posts.map((post) => <article className={styles.collectionCard} key={post.id}>
          <ProjectPreview dsl={post.dsl} locale={locale} />
          <p>{english ? "REVIEWED SOURCE" : "审核通过的来源作品"}</p>
          <h2>{post.title ?? post.dsl.text}</h2>
          <small>{post.dsl.script} · {post.dsl.mode === "yin" ? (english ? "Yin" : "阴文") : (english ? "Yang" : "阳文")}</small>
          <Link className="outline-button" href={galleryPracticeHref(post.dsl, locale)}><Icon name="stamp" size={16} />{english ? "Study structure" : "练习结构"}</Link>
        </article>)}
        {detail.posts.length === 0 ? <p className={styles.empty}>{english ? "This collection has no referenced works yet." : "此合集尚未收藏作品。"}</p> : null}
      </section>
    </> : <section aria-live="polite" className={styles.collectionState}><h1>{english ? "Collection" : "合集"}</h1><p>{status}</p><Link className="outline-button" href={localizeHref("/gallery", locale)}>{english ? "Back to Gallery" : "返回用户印谱"}<Icon name="arrow" /></Link></section>}
  </main>;
}
