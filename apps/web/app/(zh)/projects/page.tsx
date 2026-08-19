"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { ProjectPreview } from "@/components/projects/project-preview";
import {
  ANONYMOUS_PROJECT_LIMIT,
  duplicateProject,
  getProjectCurrentVersion,
  readProjectLibrary,
  renameProject,
  setProjectArchived,
  type ProjectLibrary,
  type SealProject,
} from "@/lib/project-store";
import { readAccountSyncState } from "@/lib/sync-state";
import styles from "./projects.module.css";

function ProjectCard({
  project,
  onChange,
  onMessage,
}: {
  project: SealProject;
  onChange: () => void;
  onMessage: (message: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const version = getProjectCurrentVersion(project);

  function saveName() {
    const renamed = renameProject(window.localStorage, project.id, name);
    if (!renamed) {
      setName(project.name);
      setRenaming(false);
      return;
    }
    setRenaming(false);
    onChange();
    onMessage(`已将项目重命名为「${renamed.name}」。`);
  }

  function copy() {
    const result = duplicateProject(window.localStorage, project.id);
    if (!result.ok) {
      onMessage(result.reason === "PROJECT_LIMIT"
        ? "本地项目已达到 5 个上限，无法继续复制。"
        : "复制失败，请稍后重试。");
      return;
    }
    onChange();
    onMessage(`已创建「${result.project.name}」。`);
  }

  function archive() {
    const archived = setProjectArchived(window.localStorage, project.id, !project.archivedAt);
    if (!archived) return;
    onChange();
    onMessage(project.archivedAt ? "项目已移回最近项目。" : "项目已归档，所有版本仍保留在本机。");
  }

  return (
    <article className={`paper-panel ${styles.card}`}>
      <Link aria-label={`打开${project.name}项目详情`} className={styles.preview} href={`/projects/${encodeURIComponent(project.id)}`}>
        <ProjectPreview className={styles.previewArtwork} dsl={version.dsl} />
        <span>{version.dsl.mode === "yin" ? "白文" : "朱文"} · {version.dsl.physical.sizeMm} mm</span>
      </Link>
      <div className={styles.cardBody}>
        {renaming ? (
          <form className={styles.renameForm} onSubmit={(event) => { event.preventDefault(); saveName(); }}>
            <label className="field-label" htmlFor={`project-name-${project.id}`}>项目名</label>
            <input autoFocus className="paper-input" id={`project-name-${project.id}`} maxLength={40} onChange={(event) => setName(event.target.value)} value={name} />
            <div><button type="submit"><Icon name="save" />保存名称</button><button onClick={() => { setName(project.name); setRenaming(false); }} type="button">取消</button></div>
          </form>
        ) : (
          <>
            <div className={styles.cardHeading}><h2>{project.name}</h2><span>v{version.number}</span></div>
            <p>更新于 {new Date(project.updatedAt).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <p>{project.versions.length} 个不可变版本 · DSL {version.dsl.version}</p>
          </>
        )}
        <div className={styles.actions}>
          <Link href={`/projects/${encodeURIComponent(project.id)}`}><Icon name="history" />版本详情</Link>
          <Link href={`/studio?projectId=${encodeURIComponent(project.id)}`}><Icon name="edit" />继续编辑</Link>
          <button onClick={() => setRenaming(true)} type="button"><Icon name="edit" />重命名</button>
          <button onClick={copy} type="button"><Icon name="copy" />复制</button>
          <button onClick={archive} type="button"><Icon name={project.archivedAt ? "restore" : "archive"} />{project.archivedAt ? "取消归档" : "归档"}</button>
        </div>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const [library, setLibrary] = useState<ProjectLibrary | null>(null);
  const [linkedAccount, setLinkedAccount] = useState(false);
  const [view, setView] = useState<"recent" | "archived">("recent");
  const [message, setMessage] = useState("项目和完整版本仅保存在当前浏览器。");

  function refresh() {
    setLibrary(readProjectLibrary(window.localStorage));
    setLinkedAccount(readAccountSyncState(window.localStorage).accountId !== null);
  }

  useEffect(() => refresh(), []);

  const projects = library?.projects.filter((project) => (
    view === "archived" ? project.archivedAt !== null : project.archivedAt === null
  )) ?? [];

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>LOCAL PROJECTS · M4</span>
            <h1>我的项目</h1>
            <p>每一次保存都是可复现的 Seal DSL 快照。恢复历史只会创建新版本，不会抹去后续工作。</p>
          </div>
          <Link className="primary-button" href="/create"><Icon name="add" />新建印章</Link>
        </header>

        <section aria-label="项目筛选和容量" className={styles.toolbar}>
          <div className="segmented-control">
            <button aria-pressed={view === "recent"} className={view === "recent" ? "segment-button is-selected" : "segment-button"} onClick={() => setView("recent")} type="button">最近项目</button>
            <button aria-pressed={view === "archived"} className={view === "archived" ? "segment-button is-selected" : "segment-button"} onClick={() => setView("archived")} type="button">已归档</button>
          </div>
          <span>{linkedAccount
            ? `${library?.projects.length ?? 0} 个同步项目`
            : `${library?.projects.length ?? 0} / ${ANONYMOUS_PROJECT_LIMIT} 个本地项目`}</span>
        </section>

        <p aria-live="polite" className={styles.message}>{message}</p>
        {library === null ? <p className={styles.loading}>正在读取本地项目…</p> : null}
        {library !== null && projects.length === 0 ? (
          <section className={`paper-panel ${styles.empty}`}>
            <span aria-hidden="true">方寸</span>
            <h2>{view === "recent" ? "还没有项目" : "暂无归档项目"}</h2>
            <p>{view === "recent" ? "从生成器选择方案，在专业编辑器中保存第一个项目。" : "归档项目会完整保留 DSL 与版本历史。"}</p>
            {view === "recent" ? <Link className="outline-button" href="/create"><Icon name="add" />开始生成</Link> : null}
          </section>
        ) : null}
        <section aria-label={view === "recent" ? "最近项目" : "归档项目"} className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard key={project.id} onChange={refresh} onMessage={setMessage} project={project} />
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
