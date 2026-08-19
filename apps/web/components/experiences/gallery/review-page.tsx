"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { applyGalleryReview, fetchGalleryReviewDashboard, type GalleryReviewDashboard, type ReviewAppeal, type ReviewPost, type ReviewReport } from "@/lib/gallery-review-client";
import type { GalleryReviewAction, GalleryReviewSubject } from "@/lib/gallery-review-policy";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import styles from "@/app/(zh)/review/review.module.css";

type QueueAction = { label: string; requiresReason?: boolean; status: GalleryReviewAction };

function formatDate(value: string, english: boolean): string {
  return new Intl.DateTimeFormat(english ? "en-US" : "zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function QueueItem({
  actions,
  detail,
  english,
  id,
  onApply,
  pending,
  status,
  subtitle,
  title,
}: {
  actions: QueueAction[];
  detail: string | null;
  english: boolean;
  id: string;
  onApply: (status: GalleryReviewAction, note: string) => void;
  pending: boolean;
  status: string;
  subtitle: string;
  title: string;
}) {
  const [note, setNote] = useState("");
  return <article className={`paper-panel ${styles.item}`}>
    <header><div><span>{status.toUpperCase()}</span><h3>{title}</h3><p>{subtitle}</p></div><code>{id.slice(0, 8)}</code></header>
    {detail ? <p className={styles.detail}>{detail}</p> : null}
    {actions.some((action) => action.requiresReason) ? <label className="field-label" htmlFor={`review-note-${id}`}>{english ? "Reviewer note" : "审核说明"}<textarea className="paper-textarea" id={`review-note-${id}`} maxLength={500} onChange={(event) => setNote(event.target.value)} value={note} /></label> : null}
    <footer>{actions.map((action) => <button className={action.status === "published" || action.status === "accepted" || action.status === "resolved" ? "primary-button" : "outline-button"} disabled={pending || (action.requiresReason && note.trim().length < 5)} key={action.status} onClick={() => onApply(action.status, note)} type="button"><Icon name={action.status === "published" || action.status === "accepted" || action.status === "resolved" ? "check" : "send"} />{action.label}</button>)}</footer>
  </article>;
}

function QueueSection({ children, count, description, title }: { children: React.ReactNode; count: number; description: string; title: string }) {
  return <section className={styles.queue}><header><div><span>{String(count).padStart(2, "0")}</span><h2>{title}</h2></div><p>{description}</p></header>{count ? <div className={styles.queueList}>{children}</div> : <p className={styles.empty}>—</p>}</section>;
}

function messageForError(error: unknown, english: boolean): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "REVIEW_NOT_CONFIGURED") return english ? "Reviewer service is not configured in this environment." : "当前环境尚未配置审核服务。";
  if (code === "REVIEWER_FORBIDDEN") return english ? "Your account is not assigned the reviewer role." : "当前账户没有审核员权限。";
  if (code === "REVIEW_AUTH_REQUIRED" || code === "UNAUTHORIZED") return english ? "Sign in with an assigned reviewer account." : "请使用已授权的审核员账户登录。";
  if (code === "REVIEW_TRANSITION_INVALID") return english ? "This item changed while you were reviewing it. Reload the queue." : "该项目在处理中已发生变化，请刷新队列。";
  return english ? "The review queue is currently unavailable." : "审核队列暂时不可用。";
}

export function GalleryReviewPage({ locale = "zh-Hans" }: { locale?: Locale }) {
  const english = isEnglish(locale);
  const [dashboard, setDashboard] = useState<GalleryReviewDashboard | null>(null);
  const [message, setMessage] = useState(english ? "Checking reviewer access…" : "正在核验审核员权限…");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setMessage(english ? "Reviewer service is not configured in this environment." : "当前环境尚未配置审核服务。");
      return;
    }
    try {
      const next = await fetchGalleryReviewDashboard(client);
      setDashboard(next);
      setMessage(english ? "Queue is up to date. Every action is recorded." : "队列已更新；每次处理都会写入审计记录。");
    } catch (error) {
      setDashboard(null);
      setMessage(messageForError(error, english));
    }
  }, [english]);

  useEffect(() => { void refresh(); }, [refresh]);

  function apply(subjectType: GalleryReviewSubject, subjectId: string, nextStatus: GalleryReviewAction, reviewerNote: string) {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setPendingId(subjectId);
    void applyGalleryReview(client, { subjectType, subjectId, nextStatus, ...(reviewerNote.trim() ? { reviewerNote } : {}) })
      .then(async () => { await refresh(); })
      .catch((error) => setMessage(messageForError(error, english)))
      .finally(() => setPendingId(null));
  }

  const pendingPosts = dashboard?.posts.filter((post) => post.status === "pending") ?? [];
  const publishedPosts = dashboard?.posts.filter((post) => post.status === "published") ?? [];
  const reports = dashboard?.reports ?? [];
  const appeals = dashboard?.appeals ?? [];

  return <main className={`page-container ${styles.page}`}>
    <header className={styles.hero}><div><span>GALLERY · REVIEW WORKBENCH</span><h1>{english ? "Review workbench" : "审核工作台"}</h1><p>{english ? "A server-verified reviewer role is required. Decisions change status only; original Seal DSL snapshots remain immutable." : "进入前由服务端核验审核员角色。所有决定只改变状态，原始 Seal DSL 快照始终不可修改。"}</p></div><Link className="outline-button" href={localizeHref("/gallery", locale)}><Icon name="grid" />{english ? "Open gallery" : "查看作品区"}</Link></header>
    <p aria-live="polite" className={styles.message}>{message}</p>
    <div className={styles.summary}><span>{english ? "Pending posts" : "待审作品"}<strong>{pendingPosts.length}</strong></span><span>{english ? "Open reports" : "待处理举报"}<strong>{reports.length}</strong></span><span>{english ? "Pending appeals" : "待处理申诉"}<strong>{appeals.length}</strong></span></div>
    {dashboard ? <div className={styles.queues}>
      <QueueSection count={pendingPosts.length} description={english ? "Approve or reject a submitted snapshot." : "通过或驳回一个不可变作品快照。"} title={english ? "Submitted work" : "作品审核"}>{pendingPosts.map((post: ReviewPost) => <QueueItem actions={[{ label: english ? "Publish" : "通过并公开", status: "published" }, { label: english ? "Reject" : "驳回", requiresReason: true, status: "rejected" }]} detail={null} english={english} id={post.id} key={post.id} onApply={(status, note) => apply("post", post.id, status, note)} pending={pendingId === post.id} status={post.status} subtitle={`${post.title ?? post.text} · ${formatDate(post.createdAt, english)}`} title={post.text} />)}</QueueSection>
      <QueueSection count={reports.length} description={english ? "Reports are private to reviewers." : "举报内容仅由审核人员查看。"} title={english ? "Reports" : "举报处理"}>{reports.map((report: ReviewReport) => <QueueItem actions={[{ label: english ? "Resolve" : "确认处理", status: "resolved" }, { label: english ? "Dismiss" : "驳回举报", status: "dismissed" }]} detail={`${english ? "Reason" : "原因"}: ${report.reason}${report.detail ? ` · ${report.detail}` : ""}`} english={english} id={report.id} key={report.id} onApply={(status, note) => apply("report", report.id, status, note)} pending={pendingId === report.id} status="open" subtitle={`${english ? "Post" : "作品"} ${report.postId.slice(0, 8)} · ${formatDate(report.createdAt, english)}`} title={english ? "User report" : "用户举报"} />)}</QueueSection>
      <QueueSection count={appeals.length} description={english ? "Accepting an appeal does not automatically republish a work." : "接受申诉不会自动重新公开作品，仍需单独审核作品状态。"} title={english ? "Appeals" : "申诉处理"}>{appeals.map((appeal: ReviewAppeal) => <QueueItem actions={[{ label: english ? "Accept appeal" : "接受申诉", status: "accepted" }, { label: english ? "Reject appeal" : "驳回申诉", status: "rejected" }]} detail={appeal.reason} english={english} id={appeal.id} key={appeal.id} onApply={(status, note) => apply("appeal", appeal.id, status, note)} pending={pendingId === appeal.id} status="pending" subtitle={`${english ? "Post" : "作品"} ${appeal.postId.slice(0, 8)} · ${formatDate(appeal.createdAt, english)}`} title={english ? "Author appeal" : "作者申诉"} />)}</QueueSection>
      <QueueSection count={publishedPosts.length} description={english ? "Remove only when a reviewed public work needs to be taken down." : "只有已公开作品需要下架时才在此操作。"} title={english ? "Published work" : "已公开作品"}>{publishedPosts.map((post: ReviewPost) => <QueueItem actions={[{ label: english ? "Remove from gallery" : "下架作品", requiresReason: true, status: "removed" }]} detail={post.reviewReason} english={english} id={post.id} key={post.id} onApply={(status, note) => apply("post", post.id, status, note)} pending={pendingId === post.id} status={post.status} subtitle={`${post.title ?? post.text} · ${formatDate(post.publishedAt ?? post.createdAt, english)}`} title={post.text} />)}</QueueSection>
    </div> : null}
  </main>;
}
