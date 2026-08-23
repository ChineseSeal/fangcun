"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Icon } from "@/components/design-system/icons";
import { listOwnGalleryAppeals, listOwnGalleryPosts, submitGalleryAppeal, submitGalleryPost, type GalleryAppeal, type GalleryPost } from "@/lib/gallery-store";
import type { SealProjectVersion } from "@/lib/project-store";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./gallery-submit-card.module.css";

type AccountState = "checking" | "unconfigured" | "signed-out" | "ready";

export function GallerySubmitCard({ projectId, version }: { projectId: string; version: SealProjectVersion }) {
  const [accountState, setAccountState] = useState<AccountState>("checking");
  const [title, setTitle] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [submission, setSubmission] = useState<GalleryPost | null>(null);
  const [appeal, setAppeal] = useState<GalleryAppeal | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [message, setMessage] = useState("发布会保留当前版本的完整参数快照，审核通过前不会出现在公开作品区。");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setAccountState("unconfigured");
      return;
    }
    let active = true;
    void client.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setAccountState("signed-out");
        return;
      }
      setUser(data.user);
      setAccountState("ready");
      try {
        const [posts, appeals] = await Promise.all([
          listOwnGalleryPosts(client, data.user),
          listOwnGalleryAppeals(client, data.user),
        ]);
        if (!active) return;
        const currentSubmission = posts.find((post) => post.versionId === version.id) ?? null;
        setSubmission(currentSubmission);
        setAppeal(currentSubmission ? appeals.find((entry) => entry.postId === currentSubmission.id) ?? null : null);
      } catch {
        if (active) setMessage("无法读取当前版本的审核状态，请稍后重试。");
      }
    });
    return () => { active = false; };
  }, [version.id]);

  function submit() {
    const client = getSupabaseBrowserClient();
    if (!client || !user) return;
    startTransition(() => {
      void submitGalleryPost({ client, projectId, title, user, version })
        .then((post) => {
          setSubmission(post);
          setAppeal(null);
          setMessage("已提交审核。审核通过前不会进入公开作品区。");
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : "发布失败";
          setMessage(detail.includes("duplicate") || detail.includes("unique")
            ? "当前版本已提交过审核；请在 Studio 形成新版本后再发布。"
            : "提交失败，请稍后重试。");
        });
    });
  }

  function submitAppeal() {
    const client = getSupabaseBrowserClient();
    if (!client || !user || !submission) return;
    startTransition(() => {
      void submitGalleryAppeal({ client, postId: submission.id, reason: appealReason, user })
        .then((created) => {
          setAppeal(created);
          setAppealReason("");
          setMessage("申诉已提交，审核人员会在处理后更新结果。");
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : "申诉提交失败";
          setMessage(detail.includes("unique") || detail.includes("duplicate") ? "这枚作品已有待处理或已处理的申诉。" : "申诉提交失败，请稍后重试。");
        });
    });
  }

  const statusCopy = submission?.status === "pending"
    ? "待审核：作品尚未公开。"
    : submission?.status === "published"
      ? "已公开：审核通过，可在作品区展示。"
      : submission?.status === "rejected"
        ? "未通过审核：可以提交一次申诉。"
        : submission?.status === "removed"
          ? "已下架：可以提交一次申诉。"
          : null;

  return (
    <section aria-labelledby="gallery-submit-title" className={styles.card}>
      <header><span>GALLERY · REVIEW FIRST</span><h2 id="gallery-submit-title">提交到作品区</h2></header>
      <p>发布后会固定当前 Seal DSL、Engine、Glyph 版本与 Remix 来源；不会上传未保存的草稿。</p>
      {accountState === "ready" && !submission ? (
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label className="field-label" htmlFor="gallery-post-title">作品题名 <small>可选</small></label>
          <input className="paper-input" id="gallery-post-title" maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder={version.dsl.text} value={title} />
          <button className="primary-button" disabled={isPending} type="submit"><Icon name="send" />{isPending ? "正在提交…" : "提交审核"}</button>
        </form>
      ) : null}
      {accountState === "checking" ? <p className={styles.hint}>正在核对发布账户…</p> : null}
      {accountState === "unconfigured" ? <p className={styles.hint}>当前环境未配置公开作品服务；项目仍只保存在本地。</p> : null}
      {accountState === "signed-out" ? <Link className="outline-button" href="/account"><Icon name="user" />登录后提交审核</Link> : null}
      {submission && statusCopy ? (
        <section aria-label="当前版本审核状态" className={styles.reviewState} data-status={submission.status}>
          <span>{submission.status.toUpperCase()}</span>
          <p>{statusCopy}</p>
          {submission.reviewReason ? <p><strong>审核说明：</strong>{submission.reviewReason}</p> : null}
          {appeal ? <p><strong>申诉状态：</strong>{appeal.status === "pending" ? "待处理" : appeal.status === "accepted" ? "已接受，请关注作品状态" : "未接受"}{appeal.reviewerNote ? ` · ${appeal.reviewerNote}` : ""}</p> : null}
          {!appeal && (submission.status === "rejected" || submission.status === "removed") ? (
            <form className={styles.appealForm} onSubmit={(event) => { event.preventDefault(); submitAppeal(); }}>
              <label className="field-label" htmlFor="gallery-appeal-reason">申诉说明 <small>5–500 字</small></label>
              <textarea className="paper-textarea" id="gallery-appeal-reason" maxLength={500} minLength={5} onChange={(event) => setAppealReason(event.target.value)} required value={appealReason} />
              <button className="outline-button" disabled={isPending || appealReason.trim().length < 5} type="submit"><Icon name="send" />提交申诉</button>
            </form>
          ) : null}
        </section>
      ) : null}
      <p aria-live="polite" className={styles.message}>{message}</p>
    </section>
  );
}
