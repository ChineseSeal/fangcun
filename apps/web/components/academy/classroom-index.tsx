"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { classroomExercises, type ClassroomExerciseId } from "@fangcun/knowledge/classroom-exercises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Icon } from "@/components/design-system/icons";
import {
  createClassroom as createClassroomRecord,
  formatClassroomCode,
  listOwnClassrooms,
  normalizeClassroomCode,
  type ClassroomCollection,
} from "@/lib/classroom-store";
import { isEnglish, localizeHref, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, readSupabasePublicConfig } from "@/lib/supabase-browser";
import styles from "./classroom.module.css";

function classroomHref(locale: Locale, code: string): string {
  return localizeHref("/academy/classroom", locale) + "/" + code;
}

function errorCopy(error: unknown, english: boolean): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("TITLE_INVALID")) return english ? "Use a class title between 1 and 80 characters." : "班级名称需为 1–80 个字符。";
  if (code.includes("CODE_INVALID")) return english ? "Enter the eight-character invitation code." : "请输入 8 位邀请码。";
  if (code.includes("EXERCISE_INVALID")) return english ? "Choose one of the available exercise templates." : "请选择一个可用的课堂练习模板。";
  return english ? "The classroom service is temporarily unavailable." : "课堂服务暂时不可用，请稍后重试。";
}

export function ClassroomIndex({ locale = "zh-Hans" }: { locale?: Locale }) {
  const english = isEnglish(locale);
  const router = useRouter();
  const configured = Boolean(readSupabasePublicConfig());
  const clientRef = useRef<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomCollection[]>([]);
  const [checkingSession, setCheckingSession] = useState(configured);
  const [classTitle, setClassTitle] = useState("");
  const [exerciseId, setExerciseId] = useState<ClassroomExerciseId>("name-seal");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "">("");
  const [message, setMessage] = useState("");
  const [joinMessage, setJoinMessage] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    clientRef.current = client;
    if (!client) {
      setCheckingSession(false);
      return;
    }
    let active = true;
    const loadClassrooms = async (nextUser: User | null) => {
      if (!nextUser) {
        if (active) setClassrooms([]);
        return;
      }
      try {
        const nextClassrooms = await listOwnClassrooms(client, nextUser);
        if (active) setClassrooms(nextClassrooms);
      } catch {
        if (active) setMessage(english ? "Could not load your classrooms." : "无法读取你创建的课堂。");
      }
    };
    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      const nextUser = error ? null : data.user;
      setUser(nextUser);
      setCheckingSession(false);
      void loadClassrooms(nextUser);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setCheckingSession(false);
      void loadClassrooms(nextUser);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [english]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clientRef.current;
    if (!client || !user) return;
    setBusy("create");
    setMessage("");
    try {
      const created = await createClassroomRecord({ client, exerciseId, title: classTitle, user });
      setClassrooms((current) => [created, ...current]);
      setClassTitle("");
      setMessage(english ? "Classroom created. Share the invitation code with learners." : "课堂已创建，可以把邀请码发给学生。");
    } catch (error) {
      setMessage(errorCopy(error, english));
    } finally {
      setBusy("");
    }
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("join");
    setJoinMessage("");
    try {
      const normalized = normalizeClassroomCode(joinCode);
      router.push(classroomHref(locale, normalized));
    } catch (error) {
      setJoinMessage(errorCopy(error, english));
      setBusy("");
    }
  }

  return (
    <main className={["page-container", styles.page].join(" ")}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{english ? "CLASSROOM PRACTICE · V2" : "课堂练习 · V2"}</p>
        <h1>{english ? "Give every learner a small square to finish." : "让每个学生，都完成一方小小印面。"}</h1>
        <p>{english ? "Start with a bounded exercise, open a private classroom, and collect one final synchronized project per learner. The authoritative Seal DSL and version snapshot stay intact." : "从一个有边界的练习开始，创建私有课堂，收集每位学生的一份最终同步项目。课堂只冻结 Seal DSL 与版本快照，不接触邮箱或账户资料。"}</p>
      </header>

      <div className={styles.sectionHeading}>
        <h2>{english ? "Exercise templates" : "课堂练习模板"}</h2>
        <p>{english ? "Each prompt isolates one visible variable and opens directly in Studio." : "每个模板只隔离一个可见变量，并可直接打开 Studio。"}</p>
      </div>
      <section aria-label={english ? "Classroom exercise templates" : "课堂练习模板列表"} className={styles.templateGrid}>
        {classroomExercises.map((exercise) => (
          <article className={["paper-panel", styles.templateCard].join(" ")} key={exercise.id}>
            <header><span>{exercise.durationMinutes}′</span><small>{english ? "GUIDED" : "引导练习"}</small></header>
            <h3>{english ? exercise.titleEn : exercise.titleZh}</h3>
            <p>{english ? exercise.summaryEn : exercise.summaryZh}</p>
            <p className={styles.practiceNote}>{english ? exercise.promptEn : exercise.promptZh}</p>
            <footer><Link className="primary-button" data-testid={"classroom-studio-" + exercise.id} href={localizeHref(exercise.studioHref, locale)}><Icon name="stamp" size={16} />{english ? "Open in Studio" : "打开 Studio"}</Link></footer>
          </article>
        ))}
      </section>

      {!configured ? (
        <div className={styles.cloudNotice} role="status">
          <Icon name="lock" size={22} />
          <div><strong>{english ? "Cloud classrooms are not configured" : "云课堂尚未配置"}</strong>{english ? "The templates stay available for local practice. Add the public Supabase URL and publishable key to create private collections or join a class." : "模板仍可直接练习；配置公开 Supabase URL 与 publishable key 后，才能创建私有合集或加入课堂。"}</div>
        </div>
      ) : null}

      <section className={["paper-panel", styles.joinPanel].join(" ")}>
        <div><h2>{english ? "Join a classroom" : "加入课堂"}</h2><p>{english ? "Use the invitation code from your teacher. You will need an account before viewing or submitting work." : "输入教师发来的邀请码。查看课堂或提交作品前，需要先登录账户。"}</p></div>
        <form className={styles.joinForm} onSubmit={submitJoin}>
          <label className="field-label" htmlFor="classroom-join-code">{english ? "Invitation code" : "邀请码"}</label>
          <div><input aria-describedby="classroom-join-help" autoComplete="off" className="paper-input" id="classroom-join-code" inputMode="text" maxLength={10} onChange={(event) => setJoinCode(event.target.value)} placeholder="ABCD EF12" value={joinCode} /><button className="primary-button" disabled={busy === "join"} type="submit">{english ? "Open classroom" : "打开课堂"}</button></div>
          <small id="classroom-join-help">{english ? "Eight letters or numbers; spaces and a hyphen are optional." : "8 位字母或数字；空格和连字符可省略。"}</small>
          <span aria-live="polite" className={styles.status}>{joinMessage}</span>
        </form>
      </section>

      {configured && !checkingSession && !user ? (
        <div className={styles.cloudNotice} role="status"><Icon name="user" size={22} /><div><strong>{english ? "Sign in to teach or submit" : "登录后创建或提交"}</strong>{english ? "The classroom view never displays account email to other participants." : "课堂页面不会向其他参与者显示账户邮箱。"} <Link href="/account">{english ? "Open account" : "前往账户"}</Link></div></div>
      ) : null}

      {configured && user ? (
        <section className={["paper-panel", styles.teacherPanel].join(" ")}>
          <h2>{english ? "Teacher workspace" : "教师工作台"}</h2>
          <p>{english ? "Create a private collection, choose one prompt, and share its code. Any signed-in account can host a classroom; participant identity stays outside the classroom view." : "创建私有合集、选择一个练习，再分享邀请码。任何已登录账户都可以发起课堂；参与者身份不会出现在课堂视图中。"}</p>
          <form className={styles.createForm} onSubmit={submitCreate}>
            <label className="field-label" htmlFor="classroom-title">{english ? "Classroom title" : "课堂名称"}</label>
            <input className="paper-input" id="classroom-title" maxLength={80} onChange={(event) => setClassTitle(event.target.value)} placeholder={english ? "Autumn seal study" : "秋季篆刻课"} value={classTitle} />
            <label className="field-label" htmlFor="classroom-exercise">{english ? "Starting exercise" : "起始练习"}</label>
            <div><select className="paper-select" id="classroom-exercise" onChange={(event) => setExerciseId(event.target.value as ClassroomExerciseId)} value={exerciseId}>{classroomExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{english ? exercise.titleEn : exercise.titleZh}</option>)}</select><button className="primary-button" disabled={busy === "create"} type="submit"><Icon name="add" size={16} />{english ? "Create classroom" : "创建课堂"}</button></div>
          </form>
          <p aria-live="polite" className={styles.status}>{message}</p>
          <div className={styles.classroomList}>
            {classrooms.map((classroom) => <article className={["paper-panel", styles.classroomRow].join(" ")} data-testid="classroom-row" key={classroom.id}><div><h3>{classroom.title}</h3><p>{english ? "Code" : "邀请码"} <span className={styles.code} data-testid="classroom-code">{formatClassroomCode(classroom.joinCode)}</span> · {english ? classroom.exerciseId : classroomExercises.find((exercise) => exercise.id === classroom.exerciseId)?.titleZh}</p></div><span className={styles.statusPill} data-status={classroom.status}>{classroom.status === "open" ? (english ? "Open" : "开放") : (english ? "Closed" : "已关闭")}</span><Link className="outline-button" href={classroomHref(locale, classroom.joinCode)}>{english ? "Open" : "查看课堂"}<Icon name="arrow" size={15} /></Link></article>)}
            {classrooms.length === 0 ? <p className={styles.empty}>{english ? "Your classroom list is empty. Create the first collection above." : "还没有课堂；可以在上方创建第一个班级合集。"}</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
