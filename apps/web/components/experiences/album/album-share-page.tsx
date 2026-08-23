"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createAlbumPage, type AlbumItem } from "@fangcun/album";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { parsePublicAlbumShare, type AlbumShare } from "@/lib/album-share";
import { isEnglish, type Locale } from "@/lib/i18n";
import styles from "./album-share-page.module.css";

const svgCache = new Map<string, string>();

async function loadSvg(dsl: AlbumItem["dsl"], locale: Locale): Promise<string> {
  const key = `${locale}:${JSON.stringify(dsl)}`;
  const cached = svgCache.get(key);
  if (cached) return cached;
  const response = await fetch("/api/seals/render", {
    body: JSON.stringify({ dsl, locale }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const data = await response.json() as { svg?: unknown };
  if (!response.ok || typeof data.svg !== "string" || !data.svg) throw new Error("ALBUM_SHARE_RENDER_FAILED");
  svgCache.set(key, data.svg);
  return data.svg;
}

export function AlbumSharePage({ locale = "zh-Hans", token }: { locale?: Locale; token: string }) {
  const english = isEnglish(locale);
  const [share, setShare] = useState<AlbumShare | null>(null);
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [status, setStatus] = useState(english ? "Loading shared album…" : "正在读取分享印谱…");

  useEffect(() => {
    let active = true;
    setShare(null);
    setItems([]);
    setCurrentPageIndex(0);
    setStatus(english ? "Loading shared album…" : "正在读取分享印谱…");
    fetch(`/api/album-shares/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { error?: { code?: unknown }; ok?: unknown; share?: unknown };
        if (!response.ok || data.ok !== true || !data.share || typeof data.share !== "object") {
          const code = typeof data.error?.code === "string" ? data.error.code : "ALBUM_SHARE_UNAVAILABLE";
          throw new Error(code);
        }
        const parsed = parsePublicAlbumShare(data.share);
        if (!parsed) throw new Error("ALBUM_SHARE_UNAVAILABLE");
        return parsed;
      })
      .then((next) => {
        if (!active) return;
        setShare(next);
        setStatus(english ? "Preparing the pinned album pages…" : "正在准备固定快照页面…");
      })
      .catch((error) => {
        if (!active) return;
        const code = error instanceof Error ? error.message : "";
        setStatus(code === "ALBUM_SHARE_NOT_CONFIGURED"
          ? (english ? "Shared albums are not configured on this site." : "此站点尚未配置分享印谱。")
          : (english ? "This shared album is unavailable or has been revoked." : "此分享印谱不可用，或已被创建者撤销。"));
      });
    return () => { active = false; };
  }, [english, token]);

  const currentPageNumber = Math.min(currentPageIndex + 1, share?.pageCount ?? 1);
  const currentItems = useMemo(
    () => share?.items.filter((item) => item.page === currentPageNumber).sort((left, right) => left.slot - right.slot) ?? [],
    [currentPageNumber, share],
  );

  useEffect(() => {
    let active = true;
    if (!share) return () => { active = false; };
    if (currentItems.length === 0) {
      setItems([]);
      setStatus(english ? "This shared page has no seals." : "这一页分享印谱没有印面。");
      return () => { active = false; };
    }
    setStatus(english ? "Rendering the shared page…" : "正在渲染分享页面…");
    Promise.all(currentItems.map(async (item) => ({
      caption: item.caption ?? item.dsl.text,
      dsl: item.dsl,
      id: `${item.page}:${item.slot}`,
      source: english ? "Pinned share snapshot" : "分享固定快照",
      svg: await loadSvg(item.dsl, locale),
    } satisfies AlbumItem)))
      .then((next) => {
        if (!active) return;
        setItems(next);
        setStatus(english ? "Read-only shared page." : "只读分享页面。");
      })
      .catch(() => {
        if (active) setStatus(english ? "This shared page could not be rendered." : "此分享页面无法渲染。");
      });
    return () => { active = false; };
  }, [currentItems, english, locale, share]);

  const page = useMemo(() => share && createAlbumPage(items, {
    colophon: share.colophon,
    layout: share.layout,
    locale,
    pageNumber: currentPageNumber,
    pageSize: share.pageSize,
    perPage: share.perPage,
    title: share.title,
  }), [currentPageNumber, items, locale, share]);

  const albumHref = english ? "/en/album" : "/album";
  return <div className="paper-page">
    <SiteHeader locale={locale} />
    <main className={`page-container ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>P3 · SHARED ALBUM</span>
          <h1>{share?.title ?? (english ? "Shared seal album" : "分享印谱")}</h1>
          <p>{english ? "A read-only, pinned album snapshot. The owner can revoke this link at any time." : "这是只读的固定印谱快照；创建者可随时撤销此链接。"}</p>
        </div>
        <Link className="outline-button" href={albumHref}><Icon name="stamp" />{english ? "Create an album" : "制作印谱"}</Link>
      </header>
      <section aria-label={english ? "Shared album page" : "分享印谱页面"} className={styles.viewer}>
        {share ? <div className={styles.pageControls} aria-label={english ? "Shared album page controls" : "分享印谱页面操作"}>
          <button aria-label={english ? "Previous page" : "上一页"} disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex((index) => Math.max(0, index - 1))} type="button">{english ? "Previous" : "上一页"}</button>
          <strong data-testid="shared-album-page-position">{english ? `Page ${currentPageNumber} / ${share.pageCount}` : `第 ${currentPageNumber} / ${share.pageCount} 页`}</strong>
          <button aria-label={english ? "Next page" : "下一页"} disabled={currentPageIndex >= share.pageCount - 1} onClick={() => setCurrentPageIndex((index) => Math.min(share.pageCount - 1, index + 1))} type="button">{english ? "Next" : "下一页"}</button>
        </div> : null}
        <div className={styles.stageToolbar}>
          <span>{page ? `${page.widthMm} × ${page.heightMm} mm · ${share?.layout}` : (english ? "Pinned share" : "固定分享")}</span>
          <span>{status}</span>
        </div>
        <div className={styles.paper} data-testid="shared-album-paper">
          {page && items.length > 0 ? <div dangerouslySetInnerHTML={{ __html: page.svg }} /> : <div className={styles.empty}><span aria-hidden="true">方寸</span><p>{status}</p></div>}
        </div>
        <div className={styles.boundary}>
          <Icon name="lock" size={15} />
          <p>{english ? "This link shows only a frozen project snapshot. It does not reveal the source album, project list, account identity, or historic teaching references." : "此链接只展示固定项目快照，不会公开来源印谱、项目列表、账户身份或历史印教学参考。"}</p>
        </div>
      </section>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
