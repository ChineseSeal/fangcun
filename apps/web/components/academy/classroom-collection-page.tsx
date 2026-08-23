"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { findClassroomExercise } from "@fangcun/knowledge/classroom-exercises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Icon } from "@/components/design-system/icons";
import { ProjectPreview } from "@/components/projects/project-preview";
import {
  formatClassroomCode,
  listClassroomSubmissions,
  resolveClassroomByCode,
  submitClassroomWork,
  updateClassroomStatus,
  type ClassroomCollection,
  type ClassroomSubmission,
} from "@/lib/classroom-store";
import { formatLocalDateTime, isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import {
  getProjectCurrentVersion,
  readProjectLibrary,
  type SealProject,
  type SealProjectVersion,
} from "@/lib/project-store";
import { getSupabaseBrowserClient, readSupabasePublicConfig } from "@/lib/supabase-browser";
import styles from "./classroom.module.css";

type ViewState = "loading" | "ready" | "signed-out" | "unconfigured" | "missing" | "error";
type LocalChoice = { project: SealProject; version: SealProjectVersion };

function submissionErrorCopy(error: unknown, english: boolean): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("PROJECT_NOT_SYNCED") || code.includes("VERSION_NOT_SYNCED")) return english ? "Sync this exact project version from the account page, then submit again." : "请先在账户页同步这个项目的当前版本，再重新提交。";
  if (code.includes("CLASSROOM_CLOSED")) return english ? "This classroom has closed and no longer accepts submissions." : "课堂已关闭，不再接收提交。";
  if (code.includes("DISPLAY_NAME_INVALID")) return english ? "The optional classroom name must be 40 characters or fewer." : "课堂别名最多 40 个字符。";
  if (code.includes("PROJECT_REFERENCE_INVALID")) return english ? "Choose a valid local project version." : "请选择有效的本地项目版本。";
  return english ? "The submission could not be saved. Check your connection and try again." : "提交未能保存，请检查网络后重试。";
}

export function ClassroomCollectionPage({ code, locale = "zh-Hans" }: { code: string; locale?: Locale }) {
  const english = isEnglish(locale);
  const configured = Boolean(readSupabasePublicConfig());
  const clientRef = useRef<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [viewState, setViewState] = useState<ViewState>(configured ? "loading" : "unconfigured");
  const [collection, setCollection] = useState<ClassroomCollection | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [localChoices, setLocalChoices] = useState<LocalChoice[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    clientRef.current = client;
    if (!client) {
      setViewState("unconfigured");
      return;
    }
    let active = true;
    const load = async (nextUser: User | null) => {
      if (!nextUser) {
        if (active) {
          setUser(null);
          setCollection(null);
          setSubmissions([]);
          setViewState("signed-out");
        }
        return;
      }
      if (active) {
        setUser(nextUser);
        setViewState("loading");
      }
      try {
        const nextCollection = await resolveClassroomByCode(client, code);
        if (!active) return;
        if (!nextCollection) {
          setViewState("missing");
          return;
        }
        const nextSubmissions = await listClassroomSubmissions(client, nextCollection.id);
        if (!active) return;
        const library = readProjectLibrary(window.localStorage);
        const choices = library.projects
          .filter((project) => project.archivedAt === null)
          .map((project) => ({ project, version: getProjectCurrentVersion(project) }));
        setCollection(nextCollection);
        setSubmissions(nextSubmissions);
        setLocalChoices(choices);
        setSelectedProjectId((current) => choices.some((choice) => choice.project.id === current) ? current : choices[0]?.project.id ?? "");
        setViewState("ready");
      } catch {
        if (active) setViewState("error");
      }
    };
    void client.auth.getUser().then(({ data, error }) => void load(error ? null : data.user));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => void load(session?.user ?? null));
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [code]);

  async function toggleClassroom() {
    const client = clientRef.current;
    if (!client || !user || !collection?.isOwner) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await updateClassroomStatus({
        client,
        collectionId: collection.id,
        status: collection.status === "open" ? "closed" : "open",
        user,
      });
      setCollection(next);
      setMessage(next.status === "open"
        ? (english ? "The classroom is open for submissions." : "课堂已重新开放提交。")
        : (english ? "The classroom is closed; existing snapshots remain readable." : "课堂已关闭；已有冻结快照仍可查看。"));
    } catch {
      setMessage(english ? "The classroom status could not be changed." : "无法更新课堂状态，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation() {
    if (!collection) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage(english ? "Invitation link copied." : "邀请链接已复制。");
    } catch {
      setMessage(english ? "Copying is unavailable. Share the code shown above." : "无法自动复制，请分享页面上方的邀请码。");
    }
  }

  async function submitWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientRef.current;
    const choice = localChoices.find((candidate) => candidate.project.id === selectedProjectId);
    if (!client || !choice || !collection || collection.status !== "open") return;
    setBusy(true);
    setMessage("");
    try {
      const submission = await submitClassroomWork({
        client,
        displayName,
        joinCode: collection.joinCode,
        projectId: choice.project.id,
        versionId: choice.version.id,
      });
      setSubmissions([submission]);
      setMessage(english ? "Final work submitted. Submitting again will replace this classroom snapshot." : "最终稿已提交；再次提交会替换本课堂中的这份快照。");
    } catch (error) {
      setMessage(submissionErrorCopy(error, english));
    } finally {
      setBusy(false);
    }
  }

  const exercise = collection ? findClassroomExercise(collection.exerciseId) : undefined;
  const stateCopy: Record<Exclude<ViewState, "ready">, { title: string; body: string }> = {
    loading: {
      title: english ? "Opening classroom…" : "正在打开课堂…",
      body: english ? "Checking the invitation and your private access." : "正在核对邀请码与私有访问权限。",
    },
    "signed-out": {
      title: english ? "Sign in to enter" : "登录后进入课堂",
      body: english ? "Invitation details and submissions are available only to signed-in accounts." : "邀请码对应的课堂信息与提交内容仅对已登录账户开放。",
    },
    unconfigured: {
      title: english ? "Cloud classrooms are unavailable" : "云课堂尚未启用",
      body: english ? "The public Supabase URL and publishable key are missing. Exercise templates remain available from the classroom index." : "当前缺少公开 Supabase URL 与 publishable key；课堂首页的练习模板仍可本地使用。",
    },
    missing: {
      title: english ? "Classroom not found" : "没有找到这个课堂",
      body: english ? "Check the eight-character invitation code with your teacher." : "请向教师确认 8 位邀请码是否正确。",
    },
    error: {
      title: english ? "Classroom unavailable" : "课堂暂时不可用",
      body: english ? "The invitation could not be checked. Try again in a moment." : "暂时无法核对邀请码，请稍后重试。",
    },
  };

  if (viewState !== "ready" || !collection || !exercise) {
    const copy = stateCopy[viewState === "ready" ? "error" : viewState];
    return (
      <main className={["page-container", styles.detailPage].join(" ")}>
        <nav aria-label={english ? "Classroom path" : "课堂路径"} className={styles.breadcrumb}><Link href={localizeHref("/academy", locale)}>{english ? "Academy" : "篆刻学院"}</Link><span>›</span><Link href={localizeHref("/academy/classroom", locale)}>{english ? "Classroom" : "课堂练习"}</Link></nav>
        <section className={styles.state}><h1>{copy.title}</h1><p>{copy.body}</p>{viewState === "signed-out" ? <Link className="primary-button" href="/account">{english ? "Open account" : "前往账户"}<Icon name="arrow" size={16} /></Link> : <Link className="outline-button" href={localizeHref("/academy/classroom", locale)}>{english ? "Back to templates" : "返回练习模板"}</Link>}</section>
      </main>
    );
  }

  return (
    <main className={["page-container", styles.detailPage].join(" ")}>
      <nav aria-label={english ? "Classroom path" : "课堂路径"} className={styles.breadcrumb}><Link href={localizeHref("/academy", locale)}>{english ? "Academy" : "篆刻学院"}</Link><span>›</span><Link href={localizeHref("/academy/classroom", locale)}>{english ? "Classroom" : "课堂练习"}</Link><span>›</span><span>{collection.title}</span></nav>
      <header className={styles.detailHero}>
        <div><p className={styles.eyebrow}>{formatClassroomCode(collection.joinCode)} · {collection.status === "open" ? (english ? "OPEN" : "开放提交") : (english ? "CLOSED" : "已关闭")}</p><h1>{collection.title}</h1><p>{collection.isOwner ? (english ? "Teacher view · private frozen submissions" : "教师视图 · 私有冻结提交") : (english ? "Learner view · one replaceable final submission" : "学生视图 · 一份可替换最终稿")}</p></div>
        <div className={styles.detailActions}>
          <Link className="outline-button" href={localizeHref(exercise.studioHref, locale)}><Icon name="stamp" size={16} />{english ? "Open exercise" : "打开练习"}</Link>
          {collection.isOwner ? <button className="outline-button" onClick={copyInvitation} type="button"><Icon name="copy" size={16} />{english ? "Copy invitation" : "复制邀请"}</button> : null}
          {collection.isOwner ? <button className="primary-button" disabled={busy} onClick={toggleClassroom} type="button"><Icon name={collection.status === "open" ? "lock" : "unlock"} size={16} />{collection.status === "open" ? (english ? "Close classroom" : "关闭课堂") : (english ? "Reopen classroom" : "重新开放")}</button> : null}
        </div>
      </header>
      <p className={styles.detailNotice}>{english ? "A submission freezes the synchronized project version, Seal DSL, Engine version, and Glyph asset version. It does not publish the work, expose email, or enter the public Gallery review flow." : "提交会冻结已同步项目版本、Seal DSL、Engine 与 Glyph Asset 版本；它不会公开作品、显示邮箱，也不会进入用户印谱的公开审核流程。"}</p>
      <p aria-live="polite" className={styles.status}>{message}</p>

      <div className={styles.detailGrid}>
        <aside className={["paper-panel", styles.exercisePanel].join(" ")}>
          <h2>{english ? exercise.titleEn : exercise.titleZh}</h2>
          <p>{english ? exercise.promptEn : exercise.promptZh}</p>
          <p className={styles.teacherNote}><strong>{english ? "Teaching note" : "教学提示"}</strong><br />{english ? exercise.teacherNoteEn : exercise.teacherNoteZh}</p>
        </aside>

        {collection.isOwner ? (
          <section className={["paper-panel", styles.submissionsPanel].join(" ")}>
            <h2>{english ? "Final submissions" : "学生最终稿"}</h2>
            <p>{english ? submissions.length + " frozen submission" + (submissions.length === 1 ? "" : "s") + ". Names below are optional classroom aliases, never account identity." : "共 " + submissions.length + " 份冻结提交。下方名称仅为学生自填课堂别名，不是账户身份。"}</p>
            <div className={styles.submissionList}>
              {submissions.map((submission) => <article className={styles.submissionCard} data-testid="classroom-submission" key={submission.id}><ProjectPreview dsl={submission.dsl} locale={locale} /><h3>{submission.displayName ?? (english ? "Anonymous learner" : "匿名学习者")}</h3><p>{submission.dsl.text} · {submission.dsl.mode === "yin" ? (english ? "Yin" : "阴文") : (english ? "Yang" : "阳文")}</p><small>{english ? "Updated " : "更新于 "}{formatLocalDateTime(submission.updatedAt, locale)} · {submission.engineVersion} / {submission.glyphAssetVersion}</small></article>)}
              {submissions.length === 0 ? <p className={styles.empty}>{english ? "No final work has been submitted yet." : "还没有学生提交最终稿。"}</p> : null}
            </div>
          </section>
        ) : (
          <section className={["paper-panel", styles.submitPanel].join(" ")}>
            <h2>{english ? "Submit final work" : "提交最终稿"}</h2>
            <p>{collection.status === "open" ? (english ? "Choose the current version of a local project. It must already be synchronized to this account." : "选择一个本地项目的当前版本；该版本必须已同步到当前账户。") : (english ? "This classroom is closed. Your existing frozen submission remains visible below." : "课堂已关闭；已有冻结提交仍会保留在下方。")}</p>
            {localChoices.length > 0 ? (
              <form className={styles.submissionForm} onSubmit={submitWork}>
                <fieldset>
                  <legend>{english ? "Local project version" : "本地项目版本"}</legend>
                  <div className={styles.projectChoices}>{localChoices.map((choice) => <label className={styles.projectChoice} key={choice.project.id}><input checked={selectedProjectId === choice.project.id} name="classroom-project" onChange={() => setSelectedProjectId(choice.project.id)} type="radio" value={choice.project.id} /><span><strong>{choice.project.name}</strong><small>{choice.version.name} · {choice.version.dsl.text}</small></span></label>)}</div>
                </fieldset>
                <label htmlFor="classroom-display-name"><span>{english ? "Classroom name (optional)" : "课堂别名（可选）"}</span><input className="paper-input" id="classroom-display-name" maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder={english ? "A name your teacher can recognize" : "方便教师识别的称呼"} value={displayName} />{english ? "This is shown only with your classroom submission." : "该称呼只随课堂提交显示。"}</label>
                <button className="primary-button" disabled={busy || collection.status !== "open" || !selectedProjectId} type="submit"><Icon name="send" size={16} />{submissions.length > 0 ? (english ? "Replace final work" : "替换最终稿") : (english ? "Submit final work" : "提交最终稿")}</button>
              </form>
            ) : <p className={styles.empty}>{english ? "No active local project is available. Create one in Studio first." : "当前没有可提交的本地项目，请先在 Studio 完成一枚印。"} <Link href={localizeHref("/create", locale)}>{english ? "Create a seal" : "开始创作"}</Link></p>}
            <p className={styles.teacherNote}>{english ? "If the project is not synchronized, open the account page and run sync before submitting." : "如果项目尚未同步，请先前往账户页完成同步，再返回提交。"} <Link href="/account">{english ? "Open account" : "前往账户"}</Link></p>
            {submissions.length > 0 ? <div className={styles.submissionList}>{submissions.map((submission) => <article className={styles.submissionCard} key={submission.id}><ProjectPreview dsl={submission.dsl} locale={locale} /><h3>{english ? "Your current final work" : "你当前的最终稿"}</h3><p>{submission.displayName ?? (english ? "No classroom name" : "未填写课堂别名")}</p><small>{english ? "Updated " : "更新于 "}{formatLocalDateTime(submission.updatedAt, locale)}</small></article>)}</div> : null}
          </section>
        )}
      </div>
    </main>
  );
}
