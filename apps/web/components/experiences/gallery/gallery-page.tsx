"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import type { User } from "@supabase/supabase-js";
import { Icon } from "@/components/design-system/icons";
import { ProjectPreview } from "@/components/projects/project-preview";
import { createGalleryCollectionWithPost, createRemixDsl, GALLERY_POSTS_PAGE_SIZE, listGalleryCreatorProfiles, listOwnGalleryCollections, listPublicGalleryCollections, listPublishedGalleryPostsPage, saveGalleryPostToCollection, submitGalleryReport, type GalleryCollection, type GalleryCollectionVisibility, type GalleryCreatorProfile, type GalleryPost, type GalleryReportReason } from "@/lib/gallery-store";
import { isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import { galleryPracticeHref } from "@/lib/gallery-practice-href";
import { createProject } from "@/lib/project-store";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "@/app/(zh)/gallery/gallery.module.css";

type EditorialWork = {
  id: string;
  title: { zh: string; en: string };
  note: { zh: string; en: string };
  dsl: SealDsl;
};

type GalleryEntry =
  | { kind: "editorial"; work: EditorialWork }
  | { kind: "published"; post: GalleryPost };

function exampleDsl(input: Parameters<typeof normalizeSealDsl>[0]): SealDsl {
  const normalized = normalizeSealDsl(input);
  if (!normalized.ok) throw new Error("EDITORIAL_GALLERY_DSL_INVALID");
  return normalized.value;
}

const editorialWorks: EditorialWork[] = [
  { id: "editorial-clear-breeze", title: { zh: "清风明月", en: "Clear breeze, bright moon" }, note: { zh: "小篆 · 章法示例", en: "Small Seal · composition study" }, dsl: exampleDsl({ mode: "yang", script: "xiaozhuan", style: "qin_formal", text: "清风明月" }) },
  { id: "editorial-contentment", title: { zh: "知足常乐", en: "Contentment" }, note: { zh: "汉印篆 · 朱文示例", en: "Han Seal · Zhuwen study" }, dsl: exampleDsl({ border: { type: "double" }, mode: "yang", script: "han_seal", style: "han_private", text: "知足常乐" }) },
  { id: "editorial-quiet-purpose", title: { zh: "宁静致远", en: "Quiet purpose" }, note: { zh: "古玺 · 留白示例", en: "Guxi · negative-space study" }, dsl: exampleDsl({ border: { type: "none" }, layout: { density: 0.58, strategy: "grid_2x2" }, script: "guxi", style: "guxi_warring_states", text: "宁静致远" }) },
  { id: "editorial-self-discipline", title: { zh: "慎独", en: "Self-discipline" }, note: { zh: "鸟虫篆 · 结构示例", en: "Bird-and-worm · structure study" }, dsl: exampleDsl({ mode: "yang", script: "bird_worm", style: "bird_worm", text: "慎独" }) },
];

const scripts = ["all", "xiaozhuan", "han_seal", "guxi", "bird_worm"] as const;
type ScriptFilter = (typeof scripts)[number];

function scriptLabel(script: ScriptFilter, english: boolean): string {
  const labels: Record<ScriptFilter, [string, string]> = {
    all: ["全部", "All"],
    xiaozhuan: ["小篆", "Small Seal"],
    han_seal: ["汉印篆", "Han Seal"],
    guxi: ["古玺", "Guxi"],
    bird_worm: ["鸟虫篆", "Bird-and-worm"],
  };
  return labels[script][english ? 1 : 0];
}

function galleryTitle(entry: GalleryEntry, english: boolean): string {
  return entry.kind === "published"
    ? entry.post.title ?? entry.post.dsl.text
    : entry.work.title[english ? "en" : "zh"];
}

function galleryDsl(entry: GalleryEntry): SealDsl {
  return entry.kind === "published" ? entry.post.dsl : entry.work.dsl;
}

function GalleryCard({ creator, entry, english, locale, onCollect, onRemix, onReport }: {
  creator: GalleryCreatorProfile | null;
  entry: GalleryEntry;
  english: boolean;
  locale: Locale;
  onCollect: (post: GalleryPost) => void;
  onRemix: (post: GalleryPost) => void;
  onReport: (post: GalleryPost) => void;
}) {
  const dsl = galleryDsl(entry);
  const title = galleryTitle(entry, english);
  const source = entry.kind === "published"
    ? english ? "Published work · reviewed creator" : "已发布作品 · 已审核创作者"
    : entry.work.note[english ? "en" : "zh"];
  return <article className={styles.workCard} data-source={entry.kind}>
    <ProjectPreview className={styles.workPreview} dsl={dsl} locale={locale} />
    <p className={styles.sourceMeta}>{source}</p>
    <h2>{title}</h2>
    <p><span className={styles.smallAvatar}>{entry.kind === "published" ? "印" : "例"}</span>{entry.kind === "published" ? creator ? <Link className={styles.creatorLink} href={localizeHref(`/creators/${creator.ownerId}`, locale)}>{creator.displayName}</Link> : (english ? "Reviewed creator" : "已审核创作者") : (english ? "Editorial example" : "策展示例")}</p>
    <footer>
      {entry.kind === "published" ? <button aria-label={english ? `Remix ${title}` : `以 ${title} 为灵感`} onClick={() => onRemix(entry.post)} type="button"><Icon name="stamp" size={16} />{english ? "Remix" : "以此为灵感"}</button> : <Link href={galleryPracticeHref(dsl, locale)}><Icon name="stamp" size={16} />{english ? "Study structure" : "练习结构"}</Link>}
      {entry.kind === "published" ? <button aria-label={english ? `Save ${title}` : `收藏 ${title}`} className="icon-button" onClick={() => onCollect(entry.post)} type="button"><Icon name="bookmark" size={16} /></button> : null}
      {entry.kind === "published" ? <button aria-label={english ? `Report ${title}` : `举报 ${title}`} className="icon-button" onClick={() => onReport(entry.post)} type="button"><Icon name="send" size={16} /></button> : null}
    </footer>
  </article>;
}

function RemixDialog({ english, onClose, onSubmit, post }: { english: boolean; onClose: () => void; onSubmit: (text: string) => void; post: GalleryPost }) {
  const [text, setText] = useState("");
  const title = post.title ?? post.dsl.text;
  return <div className={styles.modalBackdrop} role="presentation"><section aria-labelledby="remix-dialog-title" aria-modal="true" className={styles.dialog} role="dialog">
    <header><div><span>REMIX · NEW DSL</span><h2 id="remix-dialog-title">{english ? "Start from this structure" : "以此结构开始"}</h2></div><button aria-label={english ? "Close remix" : "关闭 Remix"} className="icon-button" onClick={onClose} type="button"><Icon name="add" /></button></header>
    <p>{english ? `“${title}” contributes its seal form, script, composition, border, and impression settings. Your text generates new glyphs.` : `《${title}》会提供印式、书体、章法、边框与印蜕参数；你的新文字会生成新的字形。`}</p>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(text); }}><label className="field-label" htmlFor="gallery-remix-text">{english ? "Your inscription" : "你的印文"}<small>{Array.from(text).length}/8</small></label><input autoFocus className="paper-input" id="gallery-remix-text" maxLength={8} onChange={(event) => setText(event.target.value)} value={text} /><div><button className="quiet-button" onClick={onClose} type="button">{english ? "Cancel" : "取消"}</button><button className="primary-button" disabled={!text.trim()} type="submit"><Icon name="stamp" />{english ? "Open Studio" : "进入 Studio"}</button></div></form>
  </section></div>;
}

function ReportDialog({ english, onClose, onSubmit, post }: { english: boolean; onClose: () => void; onSubmit: (reason: GalleryReportReason, detail: string) => void; post: GalleryPost }) {
  const [reason, setReason] = useState<GalleryReportReason>("copyright");
  const [detail, setDetail] = useState("");
  return <div className={styles.modalBackdrop} role="presentation"><section aria-labelledby="report-dialog-title" aria-modal="true" className={styles.dialog} role="dialog">
    <header><div><span>REPORT · REVIEW QUEUE</span><h2 id="report-dialog-title">{english ? "Report this work" : "举报此作品"}</h2></div><button aria-label={english ? "Close report" : "关闭举报"} className="icon-button" onClick={onClose} type="button"><Icon name="add" /></button></header>
    <p>{english ? `Reports for “${post.title ?? post.dsl.text}” are visible only to reviewers.` : `《${post.title ?? post.dsl.text}》的举报内容仅供审核人员查看。`}</p>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(reason, detail); }}><label className="field-label" htmlFor="gallery-report-reason">{english ? "Reason" : "举报原因"}</label><select className="paper-select" id="gallery-report-reason" onChange={(event) => setReason(event.target.value as GalleryReportReason)} value={reason}><option value="copyright">{english ? "Copyright" : "侵权"}</option><option value="impersonation">{english ? "Impersonation of an institution" : "冒充官方或机构印章"}</option><option value="illegal">{english ? "Illegal or unsafe use" : "违法违规"}</option><option value="other">{english ? "Other" : "其他"}</option></select><label className="field-label" htmlFor="gallery-report-detail">{english ? "Details (optional)" : "说明（可选）"}</label><textarea className="paper-textarea" id="gallery-report-detail" maxLength={500} onChange={(event) => setDetail(event.target.value)} value={detail} /><div><button className="quiet-button" onClick={onClose} type="button">{english ? "Cancel" : "取消"}</button><button className="primary-button" type="submit"><Icon name="send" />{english ? "Submit report" : "提交举报"}</button></div></form>
  </section></div>;
}

function CollectionDialog({ collections, english, onClose, onSubmit, pending, post }: {
  collections: GalleryCollection[];
  english: boolean;
  onClose: () => void;
  onSubmit: (collectionId: string | null, title: string, description: string, visibility: GalleryCollectionVisibility) => void;
  pending: boolean;
  post: GalleryPost;
}) {
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "new");
  const [title, setTitle] = useState(english ? "Saved seals" : "我的收藏");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GalleryCollectionVisibility>("private");
  const isNew = collectionId === "new";
  const postTitle = post.title ?? post.dsl.text;
  return <div className={styles.modalBackdrop} role="presentation"><section aria-labelledby="collection-dialog-title" aria-modal="true" className={styles.dialog} role="dialog">
    <header><div><span>COLLECTION · REFERENCE ONLY</span><h2 id="collection-dialog-title">{english ? "Save to a collection" : "收藏到合集"}</h2></div><button aria-label={english ? "Close collection" : "关闭收藏"} className="icon-button" disabled={pending} onClick={onClose} type="button"><Icon name="add" /></button></header>
    <p>{english ? `“${postTitle}” remains its original reviewed snapshot. Your collection stores only a reference.` : `《${postTitle}》会保留原有审核作品快照；合集只保存引用，不复制 Seal DSL。`}</p>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(isNew ? null : collectionId, title, description, visibility); }}>
      <label className="field-label" htmlFor="gallery-collection-select">{english ? "Collection" : "选择合集"}</label>
      <select className="paper-select" id="gallery-collection-select" onChange={(event) => setCollectionId(event.target.value)} value={collectionId}><option value="new">{english ? "Create a collection" : "新建合集"}</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}{collection.visibility === "public" ? (english ? " · public" : " · 公开") : ""}</option>)}</select>
      {isNew ? <><label className="field-label" htmlFor="gallery-collection-title">{english ? "Title" : "合集名称"}<small>1–80</small></label><input className="paper-input" id="gallery-collection-title" maxLength={80} onChange={(event) => setTitle(event.target.value)} required value={title} /><label className="field-label" htmlFor="gallery-collection-description">{english ? "Note (optional)" : "说明（可选）"}<small>280</small></label><textarea className="paper-textarea" id="gallery-collection-description" maxLength={280} onChange={(event) => setDescription(event.target.value)} value={description} /><div className={styles.visibilityChoices} role="group" aria-label={english ? "Collection visibility" : "合集可见范围"}><button aria-pressed={visibility === "private"} onClick={() => setVisibility("private")} type="button">{english ? "Private" : "私有"}</button><button aria-pressed={visibility === "public"} onClick={() => setVisibility("public")} type="button">{english ? "Public" : "公开"}</button></div></> : null}
      <div><button className="quiet-button" disabled={pending} onClick={onClose} type="button">{english ? "Cancel" : "取消"}</button><button className="primary-button" disabled={pending || (isNew && !title.trim())} type="submit"><Icon name="bookmark" />{pending ? (english ? "Saving…" : "正在收藏…") : (english ? "Save work" : "收藏作品")}</button></div>
    </form>
  </section></div>;
}

export function GalleryPage({ locale = "zh-Hans" }: { locale?: Locale }) {
  const english = isEnglish(locale);
  const router = useRouter();
  const [account, setAccount] = useState<User | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [collectionTarget, setCollectionTarget] = useState<GalleryPost | null>(null);
  const [configured, setConfigured] = useState(false);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, GalleryCreatorProfile>>({});
  const [filter, setFilter] = useState<ScriptFilter>("all");
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [publicCollections, setPublicCollections] = useState<GalleryCollection[]>([]);
  const [query, setQuery] = useState("");
  const [remixTarget, setRemixTarget] = useState<GalleryPost | null>(null);
  const [reportTarget, setReportTarget] = useState<GalleryPost | null>(null);
  const [status, setStatus] = useState(english ? "Loading published works..." : "正在读取已发布作品…");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus(english ? "This environment shows editorial examples only." : "当前环境仅展示策展示例，尚未配置公开作品服务。");
      return;
    }
    setConfigured(true);
    let active = true;
    const loadCreatorProfiles = (items: readonly GalleryPost[]) => {
      void listGalleryCreatorProfiles(client, items.map((post) => post.ownerId))
        .then((profiles) => {
          if (!active) return;
          setCreatorProfiles((current) => ({ ...current, ...Object.fromEntries(profiles.map((profile) => [profile.ownerId, profile])) }));
        })
        .catch(() => undefined);
    };
    void Promise.all([client.auth.getUser(), listPublishedGalleryPostsPage({ client }), listPublicGalleryCollections(client)])
      .then(([userResponse, published, publicShelf]) => {
        if (!active) return;
        const user = userResponse.data.user ?? null;
        setAccount(user);
        setPosts(published.posts);
        setHasMorePosts(published.hasMore);
        setPublicCollections(publicShelf);
        loadCreatorProfiles(published.posts);
        if (user) {
          void listOwnGalleryCollections(client, user)
            .then((owned) => {
              if (!active) return;
              setCollections((current) => [
                ...current,
                ...owned.filter((collection) => !current.some((item) => item.id === collection.id)),
              ]);
            })
            .catch(() => { if (active) setStatus(english ? "Your saved collections are unavailable. Published works remain available." : "个人收藏暂时不可用，仍可浏览公开作品。"); });
        }
        setStatus(published.posts.length ? (english ? `${published.posts.length} reviewed works are available.` : `已载入 ${published.posts.length} 枚审核通过的作品。`) : (english ? "No public works have passed review yet." : "暂时没有已审核公开作品。"));
      })
      .catch(() => { if (active) setStatus(english ? "Published works are unavailable. Editorial examples remain available." : "公开作品暂时不可用，仍可浏览策展示例。"); });
    return () => { active = false; };
  }, [english]);

  function loadMorePosts() {
    const client = getSupabaseBrowserClient();
    if (!client || loadingMorePosts || !hasMorePosts) return;
    const offset = posts.length;
    setLoadingMorePosts(true);
    void listPublishedGalleryPostsPage({ client, offset, pageSize: GALLERY_POSTS_PAGE_SIZE })
      .then((nextPage) => {
        setPosts((current) => [
          ...current,
          ...nextPage.posts.filter((post) => !current.some((existing) => existing.id === post.id)),
        ]);
        setHasMorePosts(nextPage.hasMore);
        void listGalleryCreatorProfiles(client, nextPage.posts.map((post) => post.ownerId))
          .then((profiles) => setCreatorProfiles((current) => ({ ...current, ...Object.fromEntries(profiles.map((profile) => [profile.ownerId, profile])) })))
          .catch(() => undefined);
        setStatus(english ? `Loaded ${nextPage.posts.length} more reviewed works.` : `已载入另外 ${nextPage.posts.length} 枚审核通过的作品。`);
      })
      .catch(() => setStatus(english ? "More reviewed works are unavailable. Try again shortly." : "暂时无法载入更多审核作品，请稍后重试。"))
      .finally(() => setLoadingMorePosts(false));
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const entries: GalleryEntry[] = [...posts.map((post) => ({ kind: "published" as const, post })), ...editorialWorks.map((work) => ({ kind: "editorial" as const, work }))];
    return entries.filter((entry) => {
      const dsl = galleryDsl(entry);
      const title = galleryTitle(entry, english);
      return (filter === "all" || dsl.script === filter) && (!needle || `${title} ${dsl.text}`.toLocaleLowerCase().includes(needle));
    });
  }, [english, filter, posts, query]);

  function remix(post: GalleryPost, text: string) {
    try {
      const dsl = createRemixDsl(post.dsl, text.trim(), post.id);
      const project = createProject(window.localStorage, dsl, { assetVersion: post.glyphAssetVersion, engineVersion: post.engineVersion, name: `${dsl.text}${english ? " seal remix" : "印 Remix"}` });
      if (!project.ok) {
        setStatus(project.reason === "PROJECT_LIMIT" ? (english ? "Archive a local project before starting another remix." : "本地项目已达上限，请先归档一个项目。") : (english ? "The remix project could not be created." : "Remix 项目创建失败。"));
        return;
      }
      setRemixTarget(null);
      router.push(`${localizeHref("/studio", locale)}?projectId=${encodeURIComponent(project.project.id)}`);
    } catch {
      setStatus(english ? "The remix could not be prepared." : "无法准备此 Remix。" );
    }
  }

  function report(reason: GalleryReportReason, detail: string) {
    const client = getSupabaseBrowserClient();
    if (!client || !account || !reportTarget) {
      setStatus(english ? "Sign in to submit a report." : "登录后才可提交举报。" );
      setReportTarget(null);
      return;
    }
    startTransition(() => {
      void submitGalleryReport({ client, detail, postId: reportTarget.id, reason, user: account })
        .then(() => { setReportTarget(null); setStatus(english ? "Report received. Reviewers will handle it within 48 hours." : "已收到举报，审核人员将在 48 小时内处理。" ); })
        .catch(() => setStatus(english ? "The report could not be submitted. Try again shortly." : "举报提交失败，请稍后重试。" ));
    });
  }

  function beginCollection(post: GalleryPost) {
    if (!configured || !account) {
      setStatus(english ? "Sign in to save a work to a private collection." : "登录后才可收藏到私人合集。");
      return;
    }
    setCollectionTarget(post);
  }

  function collect(collectionId: string | null, title: string, description: string, visibility: GalleryCollectionVisibility) {
    const client = getSupabaseBrowserClient();
    if (!client || !account || !collectionTarget) return;
    const existing = collectionId ? collections.find((collection) => collection.id === collectionId) ?? null : null;
    const target = existing
      ? saveGalleryPostToCollection({ client, collectionId: existing.id, postId: collectionTarget.id }).then(() => existing)
      : createGalleryCollectionWithPost({ client, description, postId: collectionTarget.id, title, visibility });
    setCollectionSaving(true);
    void target
      .then((collection) => {
        setCollections((current) => current.some((item) => item.id === collection.id) ? current : [collection, ...current]);
        if (collection.visibility === "public") setPublicCollections((current) => current.some((item) => item.id === collection.id) ? current : [collection, ...current]);
        setCollectionTarget(null);
        setStatus(english ? `Saved to “${collection.title}”.` : `已收藏至《${collection.title}》。`);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : "";
        setStatus(detail.includes("duplicate") || detail.includes("unique") ? (english ? "This work is already in that collection." : "这枚作品已在该合集中。") : (english ? "The work could not be saved to the collection." : "收藏作品失败，请稍后重试。"));
      })
      .finally(() => setCollectionSaving(false));
  }

  return <main className={`page-container ${styles.page}`}>
    <header className={styles.heading}><div><h1>{english ? <>Gallery <i>/</i> Community seals</> : <>用户印谱 <i>/</i> 审核作品</>}</h1><p>{english ? "Public work is slow by design: each post keeps an immutable Seal DSL snapshot and passes review before it appears here." : "公开作品先保留不可变 Seal DSL 快照，再经审核展示；策展示例不代表用户发布。"}</p></div><div className={styles.search}><label><Icon name="search" /><input aria-label={english ? "Search works or inscriptions" : "搜索作品或印文"} onChange={(event) => setQuery(event.target.value)} placeholder={english ? "Search works or inscriptions" : "搜索作品或印文"} value={query} /></label><div className={styles.viewToggle} role="group" aria-label={english ? "Gallery view" : "作品显示方式"}><button aria-label={english ? "Grid view" : "网格视图"} aria-pressed={view === "grid"} className="icon-button" onClick={() => setView("grid")} type="button"><Icon name="grid" /></button><button aria-label={english ? "List view" : "列表视图"} aria-pressed={view === "list"} className="icon-button" onClick={() => setView("list")} type="button"><Icon name="list" /></button></div></div></header>
    <p aria-live="polite" className={styles.galleryStatus}>{status}</p>
    <div className={styles.tabs}>{scripts.map((script) => <button className={filter === script ? styles.tabActive : styles.tab} key={script} onClick={() => setFilter(script)} type="button">{scriptLabel(script, english)}</button>)}</div>
    <div className={styles.layout}><div className={styles.workStream}><section aria-label={english ? `${visible.length} gallery works` : `${visible.length} 枚作品`} className={view === "grid" ? styles.workGrid : styles.workList}>{visible.map((entry) => <GalleryCard creator={entry.kind === "published" ? creatorProfiles[entry.post.ownerId] ?? null : null} entry={entry} english={english} key={entry.kind === "published" ? entry.post.id : entry.work.id} locale={locale} onCollect={beginCollection} onRemix={setRemixTarget} onReport={setReportTarget} />)}{visible.length === 0 ? <p className={styles.empty}>{english ? "No matching works. Try another script or search phrase." : "没有匹配作品，请调整书体或搜索文字。"}</p> : null}</section>{configured && hasMorePosts ? <div className={styles.loadMore}><button aria-busy={loadingMorePosts} className="outline-button" disabled={loadingMorePosts} onClick={loadMorePosts} type="button"><Icon name="arrow" />{loadingMorePosts ? (english ? "Loading…" : "正在载入…") : (english ? "Load more reviewed works" : "加载更多审核作品")}</button><p>{english ? "This Gallery uses deliberate pages, never an infinite feed." : "作品区使用明确分页，不使用无限下拉信息流。"}</p></div> : null}</div>
      <aside className={styles.sidebar}><section className="paper-panel"><h2>{english ? "Publication boundary" : "发布边界"}</h2><p>{english ? "A submission is private while pending. Only reviewed posts can be read publicly; the original DSL, Engine, Glyph version, and Remix source remain fixed." : "提交审核期间仅作者本人可见；只有通过审核的作品会公开，并永久保留原始 DSL、Engine、Glyph 版本和 Remix 来源。"}</p>{configured ? <Link className="outline-button" href={localizeHref("/account", locale)}><Icon name="user" />{account ? (english ? "Manage account" : "管理账户") : (english ? "Sign in to submit work" : "登录后提交作品")}</Link> : <p className={styles.sideNote}>{english ? "Configure the Supabase public URL and publishable key to enable submissions." : "配置 Supabase 公开 URL 与 publishable key 后即可提交审核。"}</p>}</section>{account ? <section className="paper-panel"><h2>{english ? "My collections" : "我的合集"}</h2><p>{collections.length ? (english ? `${collections.length} private or public collections.` : `已有 ${collections.length} 个私有或公开合集。`) : (english ? "Save a reviewed work to start a private collection." : "收藏一枚审核作品，即可建立私人合集。")}</p>{collections.slice(0, 3).map((collection) => <Link className={styles.collectionLink} href={localizeHref(`/collections/${collection.id}`, locale)} key={collection.id}><span>{collection.title}</span><small>{collection.visibility === "public" ? (english ? "Public" : "公开") : (english ? "Private" : "私有")}</small></Link>)}</section> : null}{publicCollections.length ? <section className="paper-panel"><h2>{english ? "Public collections" : "公开合集"}</h2><p>{english ? "Creator-arranged references, without likes or rankings." : "由创作者安静编排的作品引用，不显示点赞或排行。"}</p>{publicCollections.map((collection) => <Link className={styles.collectionLink} href={localizeHref(`/collections/${collection.id}`, locale)} key={collection.id}><span>{collection.title}</span><small>{english ? "Open" : "查看"}</small></Link>)}</section> : null}<section className="paper-panel"><h2>{english ? "Remix, not copying" : "Remix，不是复制"}</h2><p>{english ? "A Remix creates a new project with your inscription and new glyphs. It carries only the visual structure and an immutable source reference." : "Remix 会以你的印文和新字形创建项目，只继承视觉结构，并自动保留不可移除的来源引用。"}</p><Link className={styles.more} href={localizeHref("/projects", locale)}>{english ? "Open local projects" : "查看本地项目"}<Icon name="arrow" /></Link></section></aside>
    </div>
    {remixTarget ? <RemixDialog english={english} onClose={() => setRemixTarget(null)} onSubmit={(text) => remix(remixTarget, text)} post={remixTarget} /> : null}
    {reportTarget ? <ReportDialog english={english} onClose={() => setReportTarget(null)} onSubmit={report} post={reportTarget} /> : null}
    {collectionTarget ? <CollectionDialog collections={collections} english={english} onClose={() => setCollectionTarget(null)} onSubmit={collect} pending={collectionSaving} post={collectionTarget} /> : null}
    {isPending ? <span className={styles.visuallyHidden}>{english ? "Submitting report" : "正在提交举报"}</span> : null}
  </main>;
}
