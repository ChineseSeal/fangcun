"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/design-system/icons";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import {
  synchronizeAccountData,
  type AccountSyncResult,
  type ProjectConflictChoice,
  type ProjectSyncConflict,
} from "@/lib/account-sync";
import { readAchievementState, type AchievementState } from "@/lib/achievement-store";
import { readLearningProgress } from "@/lib/learning-progress";
import { readProjectLibrary } from "@/lib/project-store";
import { deleteGalleryCreatorProfile, getGalleryCreatorProfile, upsertGalleryCreatorProfile, type GalleryCreatorProfile } from "@/lib/gallery-store";
import { getSupabaseBrowserClient, readSupabasePublicConfig } from "@/lib/supabase-browser";
import { readAccountSyncState, unlinkAccountSyncState } from "@/lib/sync-state";
import styles from "./account.module.css";

type LocalSummary = {
  achievementCount: number;
  projectCount: number;
  completedLessonCount: number;
  lastSyncedAt: string | null;
  pending: boolean;
};

function readLocalSummary(): LocalSummary {
  const achievements = readAchievementState(window.localStorage);
  const projects = readProjectLibrary(window.localStorage);
  const learning = readLearningProgress(window.localStorage);
  const sync = readAccountSyncState(window.localStorage);
  return {
    achievementCount: Object.keys(achievements.earned).length,
    projectCount: projects.projects.length,
    completedLessonCount: Object.values(learning.lessons).filter((entry) => entry.status === "completed").length,
    lastSyncedAt: sync.lastSyncedAt,
    pending: sync.pendingSince !== null,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "尚未同步";
  return new Date(value).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const clientRef = useRef<SupabaseClient | null>(null);
  const automaticSyncUserRef = useRef<string | null>(null);
  const [configured] = useState(() => readSupabasePublicConfig() !== null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(configured);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(configured ? "正在核验账户会话…" : "云同步尚未配置，本地创作不受影响。");
  const [summary, setSummary] = useState<LocalSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementState | null>(null);
  const [syncResult, setSyncResult] = useState<AccountSyncResult | null>(null);
  const [conflicts, setConflicts] = useState<ProjectSyncConflict[]>([]);
  const [choices, setChoices] = useState<Record<string, ProjectConflictChoice>>({});
  const [creatorBio, setCreatorBio] = useState("");
  const [creatorDisplayName, setCreatorDisplayName] = useState("");
  const [creatorProfile, setCreatorProfile] = useState<GalleryCreatorProfile | null>(null);
  const [creatorProfileLoading, setCreatorProfileLoading] = useState(false);
  const [creatorProfileSaving, setCreatorProfileSaving] = useState(false);

  const refreshSummary = useCallback(() => {
    setSummary(readLocalSummary());
    setAchievements(readAchievementState(window.localStorage));
  }, []);

  const runSync = useCallback(async (
    syncUser: User,
    conflictChoices: Record<string, ProjectConflictChoice> = {},
  ) => {
    const client = clientRef.current;
    if (!client) return;
    setSyncing(true);
    setMessage("正在比较本机与云端快照…");
    try {
      const result = await synchronizeAccountData({
        client,
        storage: window.localStorage,
        user: syncUser,
        conflictChoices,
      });
      setSyncResult(result);
      setConflicts(result.conflicts);
      if (result.status === "conflict") {
        setMessage(`检测到 ${result.conflicts.length} 个双端修改，请逐项选择保留版本。`);
      } else {
        setChoices({});
        setMessage(result.uploadedCount > 0
          ? `已把 ${result.uploadedCount} 枚本机印章同步到你的账户。`
          : "本机项目、云端项目、学习进度与印记已同步。");
      }
      refreshSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败，本机数据仍然安全保留。");
    } finally {
      setSyncing(false);
    }
  }, [refreshSummary]);

  const readCreatorProfile = useCallback(async (profileUser: User) => {
    const client = clientRef.current;
    if (!client) return;
    setCreatorProfileLoading(true);
    try {
      const profile = await getGalleryCreatorProfile(client, profileUser.id);
      setCreatorProfile(profile);
      setCreatorDisplayName(profile?.displayName ?? "");
      setCreatorBio(profile?.bio ?? "");
    } catch {
      setCreatorProfile(null);
      setCreatorDisplayName("");
      setCreatorBio("");
    } finally {
      setCreatorProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSummary();
    if (!configured) return;
    const client = getSupabaseBrowserClient();
    clientRef.current = client;
    if (!client) {
      setCheckingSession(false);
      return;
    }

    let active = true;
    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setCheckingSession(false);
      if (error || !data.user) {
        setUser(null);
        setMessage("登录后会自动迁移本机项目与学习进度。");
        return;
      }
      setUser(data.user);
      void readCreatorProfile(data.user);
      if (automaticSyncUserRef.current !== data.user.id) {
        automaticSyncUserRef.current = data.user.id;
        void runSync(data.user);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setCheckingSession(false);
      if (event === "SIGNED_IN" && nextUser && automaticSyncUserRef.current !== nextUser.id) {
        void readCreatorProfile(nextUser);
        automaticSyncUserRef.current = nextUser.id;
        void runSync(nextUser);
      }
      if (event === "SIGNED_OUT") {
        automaticSyncUserRef.current = null;
        setSyncResult(null);
        setConflicts([]);
        setCreatorProfile(null);
        setCreatorDisplayName("");
        setCreatorBio("");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [configured, readCreatorProfile, refreshSummary, runSync]);

  useEffect(() => {
    if (!user) return;
    const syncAfterReconnect = () => void runSync(user);
    window.addEventListener("online", syncAfterReconnect);
    return () => window.removeEventListener("online", syncAfterReconnect);
  }, [runSync, user]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientRef.current;
    if (!client) return;
    setSubmitting(true);
    setMessage(mode === "sign-in" ? "正在登录…" : "正在创建账户…");
    const credentials = { email: email.trim(), password };
    const response = mode === "sign-in"
      ? await client.auth.signInWithPassword(credentials)
      : await client.auth.signUp(credentials);
    setSubmitting(false);
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    if (!response.data.session) {
      setMessage("注册成功，请先完成邮箱验证，再返回登录。");
      return;
    }
    setUser(response.data.user);
    if (response.data.user) void readCreatorProfile(response.data.user);
  }

  async function signOut() {
    const client = clientRef.current;
    if (!client) return;
    setSubmitting(true);
    const { error } = await client.auth.signOut();
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    unlinkAccountSyncState(window.localStorage);
    setUser(null);
    setCreatorProfile(null);
    setCreatorDisplayName("");
    setCreatorBio("");
    setMessage("已退出账户，项目继续保留在当前浏览器。");
    refreshSummary();
  }

  async function saveCreatorProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientRef.current;
    if (!client || !user) return;
    setCreatorProfileSaving(true);
    try {
      const profile = await upsertGalleryCreatorProfile({
        bio: creatorBio,
        client,
        displayName: creatorDisplayName,
        user,
      });
      setCreatorProfile(profile);
      setCreatorDisplayName(profile.displayName);
      setCreatorBio(profile.bio ?? "");
      setMessage("公开作者页已保存；只会展示笔名、简介与审核通过的作品。");
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes("DISPLAY_NAME") ? "公开笔名需为 1–40 个字符。" : "无法保存公开作者页，请稍后重试。");
    } finally {
      setCreatorProfileSaving(false);
    }
  }

  async function removeCreatorProfile() {
    const client = clientRef.current;
    if (!client || !user) return;
    setCreatorProfileSaving(true);
    try {
      await deleteGalleryCreatorProfile({ client, user });
      setCreatorProfile(null);
      setCreatorDisplayName("");
      setCreatorBio("");
      setMessage("公开作者页已关闭；已发布作品仍按审核状态展示，但不再链接你的笔名。");
    } catch {
      setMessage("无法关闭公开作者页，请稍后重试。");
    } finally {
      setCreatorProfileSaving(false);
    }
  }

  const allConflictsResolved = conflicts.length > 0 && conflicts.every((conflict) => choices[conflict.projectId]);

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>ACCOUNT SYNC · M4</span>
            <h1>账户与同步</h1>
            <p>作品优先。登录只用于跨设备保存完整 Seal DSL、不可变版本、学习进度与印记，不阻挡匿名创作。</p>
          </div>
          <Link className="outline-button" href="/projects"><Icon name="project" />查看本机项目</Link>
        </header>

        <section aria-label="本机数据概况" className={styles.summaryGrid}>
          <article className="paper-panel"><span>本机项目</span><strong>{summary?.projectCount ?? "—"}</strong><small>完整 DSL 与版本</small></article>
          <article className="paper-panel"><span>完成课程</span><strong>{summary?.completedLessonCount ?? "—"}</strong><small>登录后自动合并</small></article>
          <article className="paper-panel"><span>获得印记</span><strong>{summary?.achievementCount ?? "—"}</strong><small>匿名也会保留</small></article>
          <article className="paper-panel"><span>同步状态</span><strong>{summary?.pending ? "待同步" : "已安定"}</strong><small>{formatDate(summary?.lastSyncedAt ?? null)}</small></article>
        </section>

        <p aria-live="polite" className={styles.message}>{message}</p>

        {!configured ? (
          <section className={`paper-panel ${styles.notice}`}>
            <Icon name="lock" size={38} />
            <div><h2>当前为本地模式</h2><p>配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 后启用真实账户。密钥缺失时不会发送任何项目数据。</p></div>
          </section>
        ) : null}

        {configured && checkingSession ? <section className={`paper-panel ${styles.notice}`}><Icon name="history" /><p>正在安全核验会话…</p></section> : null}

        {configured && !checkingSession && !user ? (
          <section className={styles.authLayout}>
            <form className={`paper-panel ${styles.authCard}`} onSubmit={submitAuth}>
              <div className="segmented-control">
                <button aria-pressed={mode === "sign-in"} className={mode === "sign-in" ? "segment-button is-selected" : "segment-button"} onClick={() => setMode("sign-in")} type="button">登录</button>
                <button aria-pressed={mode === "sign-up"} className={mode === "sign-up" ? "segment-button is-selected" : "segment-button"} onClick={() => setMode("sign-up")} type="button">注册</button>
              </div>
              <h2>{mode === "sign-in" ? "继续你的方寸" : "建立同步账户"}</h2>
              <label className="field-label" htmlFor="account-email">邮箱</label>
              <input autoComplete="email" className="paper-input" id="account-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
              <label className="field-label" htmlFor="account-password">密码</label>
              <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="paper-input" id="account-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              <button className="primary-button" disabled={submitting} type="submit"><Icon name="user" />{submitting ? "请稍候…" : mode === "sign-in" ? "登录并同步" : "注册账户"}</button>
            </form>
            <aside className={`paper-panel ${styles.promise}`}><h2>同步原则</h2><ul><li>本机单边更新自动上传。</li><li>云端单边更新自动拉取。</li><li>双端同时修改绝不静默覆盖。</li><li>退出后本机数据仍保留。</li></ul></aside>
          </section>
        ) : null}

        {user ? (
          <section className={`paper-panel ${styles.accountCard}`}>
            <div className={styles.accountIdentity}><span><Icon name="user" size={28} /></span><div><small>已登录</small><h2>{user.email ?? "方寸账户"}</h2></div></div>
            <div className={styles.accountActions}>
              {user.app_metadata.gallery_reviewer === true ? <Link className="outline-button" href="/review"><Icon name="lock" />审核工作台</Link> : null}
              <button className="primary-button" disabled={syncing} onClick={() => void runSync(user)} type="button"><Icon name="refresh" />{syncing ? "同步中…" : "立即同步"}</button>
              <button className="outline-button" disabled={submitting} onClick={() => void signOut()} type="button">退出登录</button>
            </div>
            {syncResult?.status === "synced" ? <p>云端现有 {syncResult.projectCount} 个项目，已完成 {syncResult.completedLessonCount} 课，获得 {syncResult.achievementCount} 枚印记。</p> : null}
          </section>
        ) : null}

        {user ? (
          <section aria-labelledby="creator-profile-heading" className={`paper-panel ${styles.creatorProfile}`}>
            <header><div><span>PUBLIC CREATOR PROFILE</span><h2 id="creator-profile-heading">公开作者页</h2></div>{creatorProfile ? <Link className="outline-button" href={`/creators/${creatorProfile.ownerId}`}><Icon name="arrow" />查看公开页</Link> : null}</header>
            <p>笔名与简介只在公开作品页展示，绝不从账户邮箱或 Auth 资料自动生成，也不用于权限判断。公开页只列出审核通过的作品，不提供关注、私信或排行。</p>
            {creatorProfileLoading ? <p className={styles.creatorProfileState}>正在读取公开作者页…</p> : <form onSubmit={saveCreatorProfile}>
              <label className="field-label" htmlFor="creator-display-name">公开笔名<small>{Array.from(creatorDisplayName).length}/40</small></label>
              <input className="paper-input" id="creator-display-name" maxLength={40} onChange={(event) => setCreatorDisplayName(event.target.value)} required value={creatorDisplayName} />
              <label className="field-label" htmlFor="creator-bio">公开简介（可选）<small>{Array.from(creatorBio).length}/280</small></label>
              <textarea className="paper-input" id="creator-bio" maxLength={280} onChange={(event) => setCreatorBio(event.target.value)} rows={3} value={creatorBio} />
              <div className={styles.creatorProfileActions}><button className="primary-button" disabled={creatorProfileSaving} type="submit"><Icon name="user" />{creatorProfileSaving ? "正在保存…" : creatorProfile ? "更新公开作者页" : "创建公开作者页"}</button>{creatorProfile ? <button className="quiet-button" disabled={creatorProfileSaving} onClick={() => void removeCreatorProfile()} type="button">关闭公开作者页</button> : null}</div>
            </form>}
          </section>
        ) : null}

        {user && conflicts.length > 0 ? (
          <section aria-labelledby="sync-conflicts-heading" className={styles.conflictSection}>
            <header><span>需要你的判断</span><h2 id="sync-conflicts-heading">双端修改冲突</h2><p>选择只决定这个项目的同步版本；在你确认前不会写入云端或覆盖本机。</p></header>
            <div className={styles.conflictList}>
              {conflicts.map((conflict) => (
                <article className="paper-panel" key={conflict.projectId}>
                  <h3>{conflict.local.name}</h3>
                  <div className={styles.choiceGrid}>
                    <button aria-pressed={choices[conflict.projectId] === "local"} onClick={() => setChoices((current) => ({ ...current, [conflict.projectId]: "local" }))} type="button"><strong>保留本机</strong><span>{formatDate(conflict.local.updatedAt)} · {conflict.local.versions.length} 个版本</span></button>
                    <button aria-pressed={choices[conflict.projectId] === "remote"} onClick={() => setChoices((current) => ({ ...current, [conflict.projectId]: "remote" }))} type="button"><strong>使用云端</strong><span>{formatDate(conflict.remote.updatedAt)} · {conflict.remote.versions.length} 个版本</span></button>
                  </div>
                </article>
              ))}
            </div>
            <button className="primary-button" disabled={!allConflictsResolved || syncing} onClick={() => void runSync(user, choices)} type="button"><Icon name="check" />确认并完成同步</button>
          </section>
        ) : null}

        {achievements ? <AchievementGrid state={achievements} /> : null}
      </main>
      <SiteFooter />
    </div>
  );
}
