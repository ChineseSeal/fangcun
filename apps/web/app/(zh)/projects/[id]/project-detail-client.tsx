"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { GallerySubmitCard } from "@/components/gallery/gallery-submit-card";
import { ProjectPreview } from "@/components/projects/project-preview";
import {
  findProject,
  getProjectCurrentVersion,
  getVisibleProjectVersions,
  PROJECT_VERSION_REASON_LABELS,
  renameProjectVersion,
  restoreProjectVersion,
  type SealProject,
  type SealProjectVersion,
} from "@/lib/project-store";
import { compareProjectVersions } from "@/lib/project-version-diff";
import styles from "./project-detail.module.css";

const scriptLabels: Record<SealProjectVersion["dsl"]["script"], string> = {
  xiaozhuan: "小篆",
  han_seal: "汉印篆",
  guxi: "古玺",
  bird_worm: "鸟虫篆",
  jinwen: "金文",
  jiaguwen: "甲骨文",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VersionLabel({ version }: { version: SealProjectVersion }) {
  return <>v{version.number} · {version.name}</>;
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<SealProject | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [versionName, setVersionName] = useState("");
  const [message, setMessage] = useState("选择任意两个版本，核对印面与可复现参数差异。");

  useEffect(() => {
    const found = findProject(window.localStorage, projectId);
    setProject(found);
    setLoaded(true);
    if (!found) return;
    const visible = getVisibleProjectVersions(found);
    const current = getProjectCurrentVersion(found);
    setRightVersionId(current.id);
    setLeftVersionId(visible.find((version) => version.id !== current.id)?.id ?? current.id);
  }, [projectId]);

  const visibleVersions = useMemo(
    () => project ? getVisibleProjectVersions(project) : [],
    [project],
  );
  const versionsById = useMemo(
    () => new Map(project?.versions.map((version) => [version.id, version]) ?? []),
    [project],
  );
  const leftVersion = versionsById.get(leftVersionId) ?? null;
  const rightVersion = versionsById.get(rightVersionId) ?? null;
  const differences = useMemo(
    () => leftVersion && rightVersion ? compareProjectVersions(leftVersion, rightVersion) : [],
    [leftVersion, rightVersion],
  );
  const currentVersion = project ? getProjectCurrentVersion(project) : null;
  const exportVersions = project
    ? [...project.versions.filter((version) => version.reason === "export")].reverse()
    : [];

  function restore(version: SealProjectVersion) {
    if (!project || version.id === project.currentVersionId) return;
    const result = restoreProjectVersion(window.localStorage, project.id, version.id);
    if (!result.ok) {
      setMessage("版本恢复失败，原有历史未被修改。");
      return;
    }
    setProject(result.project);
    setLeftVersionId(version.id);
    setRightVersionId(result.version.id);
    setMessage(`已从 v${version.number} 恢复并创建 v${result.version.number}；后续版本仍完整保留。`);
  }

  function startRename(version: SealProjectVersion) {
    setRenamingVersionId(version.id);
    setVersionName(version.name);
  }

  function saveVersionName() {
    if (!project || !renamingVersionId) return;
    const renamed = renameProjectVersion(
      window.localStorage,
      project.id,
      renamingVersionId,
      versionName,
    );
    if (!renamed) {
      setMessage("版本名称不能为空。");
      return;
    }
    setProject(renamed);
    setRenamingVersionId(null);
    setMessage(`版本已命名为「${versionName.trim()}」。`);
  }

  if (!loaded) {
    return (
      <div className="paper-page">
        <SiteHeader />
        <main className={`page-container ${styles.state}`}><p>正在读取本地项目…</p></main>
        <SiteFooter />
      </div>
    );
  }

  if (!project || !currentVersion) {
    return (
      <div className="paper-page">
        <SiteHeader />
        <main className={`page-container ${styles.state}`}>
          <span aria-hidden="true">方寸</span>
          <h1>没有找到这个项目</h1>
          <p>项目可能只保存在另一个浏览器，或已被本地数据清理。</p>
          <Link className="outline-button" href="/projects"><Icon name="arrow" />返回我的项目</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <nav aria-label="项目面包屑" className={styles.breadcrumb}>
          <Link href="/projects">我的项目</Link><span aria-hidden="true">/</span><span>{project.name}</span>
        </nav>

        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>PROJECT DETAIL · IMMUTABLE HISTORY</span>
            <h1>{project.name}</h1>
            <p>当前为 v{currentVersion.number}，共保留 {project.versions.length} 个完整 Seal DSL 快照。</p>
          </div>
          <div className={styles.heroActions}>
            <Link className="outline-button" href="/projects"><Icon name="grid" />项目列表</Link>
            <Link className="primary-button" href={`/studio?projectId=${encodeURIComponent(project.id)}`}><Icon name="edit" />编辑当前版本</Link>
          </div>
        </header>

        <p aria-live="polite" className={styles.message}>{message}</p>

        <section aria-labelledby="current-version-title" className={`paper-panel ${styles.overview}`}>
          <div className={styles.currentPreview}>
            <ProjectPreview dsl={currentVersion.dsl} />
          </div>
          <div className={styles.currentFacts}>
            <span>当前版本</span>
            <h2 id="current-version-title"><VersionLabel version={currentVersion} /></h2>
            <p>{PROJECT_VERSION_REASON_LABELS[currentVersion.reason]} · {formatDate(currentVersion.createdAt)}</p>
            <dl>
              <div><dt>印式</dt><dd>{currentVersion.dsl.mode === "yin" ? "白文" : "朱文"}</dd></div>
              <div><dt>书体</dt><dd>{scriptLabels[currentVersion.dsl.script]}</dd></div>
              <div><dt>尺寸</dt><dd>{currentVersion.dsl.physical.sizeMm} mm</dd></div>
              <div><dt>Seed</dt><dd className="technical-value">{currentVersion.dsl.impression.seed}</dd></div>
              <div><dt>Engine</dt><dd className="technical-value">{currentVersion.engineVersion}</dd></div>
              <div><dt>Glyph</dt><dd className="technical-value">{currentVersion.assetVersion}</dd></div>
            </dl>
          </div>
        </section>

        <section aria-labelledby="compare-title" className={styles.compareSection}>
          <header className={styles.sectionHeading}>
            <div><span>VERSION COMPARE</span><h2 id="compare-title">版本对比</h2></div>
            <p>比较印面、章法、字形、印蜕与版本依赖，不以截图像素差异代替 DSL 事实。</p>
          </header>

          <div className={`paper-panel ${styles.comparePanel}`}>
            <div className={styles.compareControls}>
              <label>左稿
                <select className="paper-select" onChange={(event) => setLeftVersionId(event.target.value)} value={leftVersionId}>
                  {visibleVersions.map((version) => <option key={version.id} value={version.id}>v{version.number} · {version.name}</option>)}
                </select>
              </label>
              <button
                aria-label="交换左右版本"
                className="icon-button"
                onClick={() => {
                  setLeftVersionId(rightVersionId);
                  setRightVersionId(leftVersionId);
                }}
                type="button"
              ><Icon name="shuffle" /></button>
              <label>右稿
                <select className="paper-select" onChange={(event) => setRightVersionId(event.target.value)} value={rightVersionId}>
                  {visibleVersions.map((version) => <option key={version.id} value={version.id}>v{version.number} · {version.name}</option>)}
                </select>
              </label>
            </div>

            {leftVersion && rightVersion ? (
              <>
                <div className={styles.previewPair}>
                  <figure>
                    <ProjectPreview dsl={leftVersion.dsl} />
                    <figcaption><VersionLabel version={leftVersion} /></figcaption>
                  </figure>
                  <span aria-hidden="true" className={styles.compareArrow}>→</span>
                  <figure>
                    <ProjectPreview dsl={rightVersion.dsl} />
                    <figcaption><VersionLabel version={rightVersion} /></figcaption>
                  </figure>
                </div>
                <div className={styles.diffHeading}>
                  <strong>{differences.length > 0 ? `${differences.length} 项变化` : "两个版本内容一致"}</strong>
                  <span>完整 DSL · Engine · Glyph Asset</span>
                </div>
                {differences.length > 0 ? (
                  <div className={styles.diffTableWrap}>
                    <table className={styles.diffTable}>
                      <thead><tr><th>分类</th><th>参数</th><th>左稿</th><th>右稿</th></tr></thead>
                      <tbody>
                        {differences.map((difference) => (
                          <tr key={difference.path}>
                            <td>{difference.group}</td><th scope="row">{difference.label}</th><td>{difference.before}</td><td>{difference.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className={styles.noDifference}>几何与可复现依赖完全一致，可安全视为同一版本内容。</p>}
              </>
            ) : null}
          </div>
        </section>

        <div className={styles.lowerGrid}>
          <section aria-labelledby="timeline-title" className={`paper-panel ${styles.timeline}`}>
            <header className={styles.panelHeading}>
              <div><span>HISTORY</span><h2 id="timeline-title">版本时间线</h2></div>
              <strong>{visibleVersions.length}</strong>
            </header>
            <div className={styles.timelineList}>
              {visibleVersions.map((version) => {
                const isCurrent = version.id === project.currentVersionId;
                const isRenaming = version.id === renamingVersionId;
                return (
                  <article className={isCurrent ? styles.timelineCurrent : styles.timelineItem} key={version.id}>
                    <div className={styles.timelineMarker}><span>v{version.number}</span></div>
                    <div className={styles.timelineBody}>
                      {isRenaming ? (
                        <form onSubmit={(event) => { event.preventDefault(); saveVersionName(); }}>
                          <label className="field-label" htmlFor={`version-name-${version.id}`}>版本名称</label>
                          <input autoFocus className="paper-input" id={`version-name-${version.id}`} maxLength={40} onChange={(event) => setVersionName(event.target.value)} value={versionName} />
                          <div><button className="quiet-button" type="submit"><Icon name="save" />保存</button><button className="quiet-button" onClick={() => setRenamingVersionId(null)} type="button">取消</button></div>
                        </form>
                      ) : (
                        <>
                          <header><h3>{version.name}</h3>{isCurrent ? <span>当前</span> : null}</header>
                          <p>{PROJECT_VERSION_REASON_LABELS[version.reason]} · {formatDate(version.createdAt)}</p>
                          <div className={styles.timelineActions}>
                            <button aria-pressed={version.id === leftVersionId} onClick={() => setLeftVersionId(version.id)} type="button">设为左稿</button>
                            <button aria-pressed={version.id === rightVersionId} onClick={() => setRightVersionId(version.id)} type="button">设为右稿</button>
                            <button onClick={() => startRename(version)} type="button"><Icon name="edit" size={15} />命名</button>
                            <button disabled={isCurrent} onClick={() => restore(version)} type="button"><Icon name="restore" size={15} />{isCurrent ? "当前版本" : "恢复"}</button>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className={styles.sideStack}>
            <GallerySubmitCard projectId={project.id} version={currentVersion} />
            <section aria-labelledby="exports-title" className={`paper-panel ${styles.exports}`}>
              <header className={styles.panelHeading}>
                <div><span>EXPORT LOG</span><h2 id="exports-title">导出记录</h2></div>
                <strong>{exportVersions.length}</strong>
              </header>
              {exportVersions.length > 0 ? (
                <ol>{exportVersions.map((version) => <li key={version.id}><span>v{version.number} · {version.name}</span><time dateTime={version.createdAt}>{formatDate(version.createdAt)}</time></li>)}</ol>
              ) : <p>当前还没有导出快照。每次在 Studio 导出都会自动记录可追溯版本。</p>}
              <Link className="outline-button" href={`/studio?projectId=${encodeURIComponent(project.id)}`}><Icon name="download" />前往 Studio 导出</Link>
              <small>项目和版本仍只保存在当前浏览器；登录后同步将在后续切片接入。</small>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
