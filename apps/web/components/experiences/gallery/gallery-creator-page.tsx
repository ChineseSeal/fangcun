"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/design-system/icons";
import { ProjectPreview } from "@/components/projects/project-preview";
import { GALLERY_POSTS_PAGE_SIZE, getGalleryCreatorProfile, listPublishedGalleryPostsPage, type GalleryCreatorProfile, type GalleryPost } from "@/lib/gallery-store";
import { isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import { galleryPracticeHref } from "@/lib/gallery-practice-href";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "@/app/(zh)/gallery/gallery.module.css";

export function GalleryCreatorPage({ creatorId, locale = "zh-Hans" }: { creatorId: string; locale?: Locale }) {
  const english = isEnglish(locale);
  const [creator, setCreator] = useState<GalleryCreatorProfile | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [status, setStatus] = useState(english ? "Loading creator…" : "正在读取作者资料…");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus(english ? "Creator pages need the configured public gallery service." : "作者主页需要配置公开作品服务后才能查看。");
      return;
    }
    let active = true;
    void Promise.all([
      getGalleryCreatorProfile(client, creatorId),
      listPublishedGalleryPostsPage({ client, ownerId: creatorId }),
    ]).then(([profile, page]) => {
      if (!active) return;
      if (!profile) {
        setStatus(english ? "This creator profile is unavailable or not public." : "此作者资料不存在、暂不可用或尚未公开。");
        return;
      }
      setCreator(profile);
      setPosts(page.posts);
      setHasMorePosts(page.hasMore);
      setStatus("");
    }).catch(() => {
      if (active) setStatus(english ? "This creator profile is unavailable or not public." : "此作者资料不存在、暂不可用或尚未公开。");
    });
    return () => { active = false; };
  }, [creatorId, english]);

  function loadMorePosts() {
    const client = getSupabaseBrowserClient();
    if (!client || loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    void listPublishedGalleryPostsPage({ client, offset: posts.length, ownerId: creatorId, pageSize: GALLERY_POSTS_PAGE_SIZE })
      .then((page) => {
        setPosts((current) => [...current, ...page.posts.filter((post) => !current.some((item) => item.id === post.id))]);
        setHasMorePosts(page.hasMore);
      })
      .catch(() => setStatus(english ? "More works are unavailable. Try again shortly." : "暂时无法载入更多作品，请稍后重试。"))
      .finally(() => setLoadingMorePosts(false));
  }

  return <main className={`page-container ${styles.creatorPage}`}>
    <nav aria-label={english ? "Creator path" : "作者路径"} className={styles.collectionBreadcrumb}>
      <Link href={localizeHref("/gallery", locale)}>{english ? "Gallery" : "用户印谱"}</Link><span>›</span><span>{creator?.displayName ?? (english ? "Creator" : "作者")}</span>
    </nav>
    {creator ? <>
      <header className={styles.creatorHero}>
        <div className={styles.creatorMark} aria-hidden="true">印</div>
        <div>
          <p>{english ? "PUBLIC CREATOR PROFILE" : "公开作者主页"}</p>
          <h1>{creator.displayName}</h1>
          <p>{creator.bio ?? (english ? "A quiet collection of reviewed seal works." : "一组经审核公开的印章作品。")}</p>
        </div>
        <dl>
          <div><dt>{english ? "Reviewed works" : "审核作品"}</dt><dd>{posts.length}{hasMorePosts ? "+" : ""}</dd></div>
        </dl>
      </header>
      <p className={styles.creatorNotice}>{english ? "This page contains only a pen name, optional self-written bio, and reviewed work. It never exposes the account email or follows, messages, or rankings." : "此页只展示作者主动填写的笔名、可选简介与审核通过的作品；不会公开账户邮箱，也不提供关注、私信或排行。"}</p>
      <section aria-label={english ? `${posts.length} reviewed works by ${creator.displayName}` : `${creator.displayName} 的 ${posts.length} 枚审核作品`} className={styles.collectionGrid}>
        {posts.map((post) => <article className={styles.collectionCard} key={post.id}>
          <ProjectPreview dsl={post.dsl} locale={locale} />
          <p>{english ? "REVIEWED WORK" : "审核通过的作品"}</p>
          <h2>{post.title ?? post.dsl.text}</h2>
          <small>{post.dsl.script} · {post.dsl.mode === "yin" ? (english ? "Yin" : "阴文") : (english ? "Yang" : "阳文")}</small>
          <Link className="outline-button" href={galleryPracticeHref(post.dsl, locale)}><Icon name="stamp" size={16} />{english ? "Study structure" : "练习结构"}</Link>
        </article>)}
        {posts.length === 0 ? <p className={styles.empty}>{english ? "No reviewed work is public yet." : "暂时没有审核通过的公开作品。"}</p> : null}
      </section>
      {hasMorePosts ? <div className={styles.loadMore}><button aria-busy={loadingMorePosts} className="outline-button" disabled={loadingMorePosts} onClick={loadMorePosts} type="button"><Icon name="arrow" />{loadingMorePosts ? (english ? "Loading…" : "正在载入…") : (english ? "Load more works" : "加载更多作品")}</button><p>{english ? "Works use explicit pages, never an infinite feed." : "作品使用明确分页，不使用无限下拉信息流。"}</p></div> : null}
    </> : <section aria-live="polite" className={styles.collectionState}><h1>{english ? "Creator" : "作者"}</h1><p>{status}</p><Link className="outline-button" href={localizeHref("/gallery", locale)}>{english ? "Back to Gallery" : "返回用户印谱"}<Icon name="arrow" /></Link></section>}
  </main>;
}
