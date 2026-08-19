"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SealDsl } from "@fangcun/dsl-schema";
import { Icon } from "@/components/design-system/icons";
import { SiteHeader } from "@/components/design-system/site-header";
import { FirstStampMotion } from "@/components/motion/first-stamp-motion";
import { recordAchievementEvent } from "@/lib/achievement-store";
import type { Locale } from "@/lib/i18n";
import { isEnglish, localizeHref } from "@/lib/i18n";
import styles from "./create.module.css";

type Candidate = {
  candidateId: string;
  score: number;
  dsl: SealDsl;
  previewSvg: string;
  explain: {
    glyphSources: Array<{ fallbackLevel: string; script: SealDsl["script"] }>;
    modeTermSlug: string;
    layoutStrategy: string;
    styleTermSlug: string;
  };
  warnings: string[];
};

type GenerateParams = {
  locale: Locale;
  mode: "yin" | "yang";
  style: string;
  text: string;
};

async function requestCandidates(params: GenerateParams) {
  const response = await fetch("/api/seals/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as { candidates?: Candidate[]; error?: { message?: string } };
  if (!response.ok || !data.candidates) {
    throw new Error(data.error?.message ?? (params.locale === "en"
      ? "Generation is unavailable. Try another inscription."
      : "暂时无法生成，请换一组文字。"));
  }
  return data.candidates;
}

const scriptLabels: Record<SealDsl["script"], { en: string; zh: string }> = {
  xiaozhuan: { en: "Small Seal Script", zh: "小篆" },
  han_seal: { en: "Han seal script", zh: "汉印篆" },
  guxi: { en: "Guxi script", zh: "古玺风格" },
  bird_worm: { en: "Bird-and-worm script", zh: "鸟虫篆" },
  jinwen: { en: "Bronze script", zh: "金文" },
  jiaguwen: { en: "Oracle bone script", zh: "甲骨文" },
};

function candidateLabel(candidate: Candidate, locale: Locale): string {
  const english = isEnglish(locale);
  const actualScripts = Array.from(new Set(candidate.explain.glyphSources.map((source) => source.script)));
  const actual = actualScripts.length === 1
    ? scriptLabels[actualScripts[0]][english ? "en" : "zh"]
    : english ? "Mixed scripts" : "混合字形";
  const requested = scriptLabels[candidate.dsl.script][english ? "en" : "zh"];
  const scriptLabel = actual === requested
    ? actual
    : english ? `${actual} (${requested} fallback)` : `${actual}（${requested}回退）`;
  const mode = english
    ? candidate.dsl.mode === "yin" ? "Baiwen" : "Zhuwen"
    : candidate.dsl.mode === "yin" ? "白文" : "朱文";
  return `${scriptLabel} · ${mode}`;
}

function candidateHasModernGlyph(candidate: Candidate): boolean {
  return candidate.warnings.some((warning) => warning.startsWith("MODERN_SEALIZATION"));
}

export function CreatePage({ locale }: { locale: Locale }) {
  const english = isEnglish(locale);
  const [text, setText] = useState("清风明月");
  const [style, setStyle] = useState("qin_formal");
  const [mode, setMode] = useState<"yin" | "yang">("yang");
  const [shape, setShape] = useState<"square" | "circle" | "rect" | "irregular">("square");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState(0);
  const [activeTab, setActiveTab] = useState(english ? "Recommended" : "推荐");
  const [status, setStatus] = useState(english ? "Generating seal candidates..." : "正在为你生成候选方案…");
  const [distress, setDistress] = useState(50);
  const [ink, setInk] = useState(50);
  const [bleed, setBleed] = useState(50);
  const [stampPlayKey, setStampPlayKey] = useState(0);
  const [parametersOpen, setParametersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialText = params.get("text") || "清风明月";
    const initialStyle = params.get("style") || "qin_formal";
    const initialMode: "yin" | "yang" = params.get("mode") === "yin" ? "yin" : "yang";
    setText(initialText);
    setStyle(initialStyle);
    setMode(initialMode);
    void requestCandidates({ text: initialText, style: initialStyle, mode: initialMode, locale })
      .then((result) => {
        setCandidates(result);
        setStampPlayKey((current) => current + 1);
        setStatus(english ? "12 candidates are ready. Select one to continue." : "已生成 12 个方案，可选择后继续精调。");
        recordAchievementEvent({
          event: "seal_generated",
          eventKey: `seal-generated:${result[0]?.candidateId ?? "candidate"}:${Date.now()}`,
        });
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : english ? "Generation failed" : "生成失败"));
  }, [english, locale]);

  const displayCandidates = useMemo(() => {
    if (!candidates.length) return [];
    return Array.from({ length: 12 }, (_, index) => ({ source: candidates[index % candidates.length], index }));
  }, [candidates]);
  const selectedSource = displayCandidates[selected]?.source;
  const studioHref = selectedSource
    ? `${localizeHref("/studio", locale)}?` + new URLSearchParams({
        text: selectedSource.dsl.text,
        style: selectedSource.dsl.style,
        mode: selectedSource.dsl.mode,
        seed: String(selectedSource.dsl.impression.seed + selected),
        candidate: String(selected % 3),
      }).toString()
    : localizeHref("/studio", locale);

  async function generate() {
    setStatus(english ? "Generating 12 seal candidates..." : "正在生成 12 个候选方案…");
    try {
      const result = await requestCandidates({ text, style, mode, locale });
      setCandidates(result);
      setSelected(0);
      setStampPlayKey((current) => current + 1);
      setStatus(english ? "12 candidates are ready. Select one to continue." : "已生成 12 个方案，可选择后继续精调。");
      recordAchievementEvent({
        event: "seal_generated",
        eventKey: `seal-generated:${result[0]?.candidateId ?? "candidate"}:${Date.now()}`,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : english ? "Generation is unavailable. Try another inscription." : "暂时无法生成，请换一组文字。");
    }
  }

  function downloadActiveSvg() {
    if (!selectedSource) return;
    const blob = new Blob([selectedSource.previewSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fangcun-candidate.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="paper-page">
      <SiteHeader locale={locale} />
      <main className={`page-container ${styles.createPage}`}>
        <aside className={`paper-panel ${styles.sidebar} ${parametersOpen ? styles.sidebarOpen : ""}`} aria-label={english ? "Generation parameters" : "生成参数"}>
          <button
            aria-expanded={parametersOpen}
            className={styles.mobileParameterToggle}
            onClick={() => setParametersOpen((current) => !current)}
            type="button"
          >
            <span><Icon name="sliders" />{english ? "Parameters" : "生成参数"}</span>
            <span>{parametersOpen ? (english ? "Collapse" : "收起") : (english ? "Expand" : "展开")}<Icon className={parametersOpen ? styles.chevronOpen : ""} name="chevron" size={15} /></span>
          </button>
          <div className={styles.sidebarBody}>
          <div className={styles.controlGroup}>
            <label className="field-label" htmlFor="create-text">{english ? "Inscription" : "文字内容"} <small>{Array.from(text).length}/8</small></label>
            <textarea className={`paper-textarea ${styles.textarea}`} id="create-text" maxLength={8} onChange={(event) => setText(event.target.value)} value={text} />
          </div>

          <div className={styles.controlGroup}>
            <strong>{english ? "Seal shape" : "印章形状"}</strong>
            <div className={styles.shapeGrid}>
              {(["square", "circle", "rect", "irregular"] as const).map((item, index) => (
                <button className={shape === item ? styles.shapeActive : styles.shapeButton} key={item} onClick={() => setShape(item)} type="button">
                  <i className={styles[item]} />
                  {(english ? ["Square", "Round", "Rectangle", "Irregular Guxi"] : ['方印', '圆印', '长方印', '古玺异形'])[index]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>{english ? "Seal script" : "篆刻书体"}</strong>
            <div className={styles.chipGrid}>
              {[
                ["qin_formal", english ? "Small Seal Script" : "小篆"], ["han_private", english ? "Han seal" : "汉印篆"], ["guxi_warring_states", english ? "Guxi" : "古玺"], ["bird_worm", english ? "Bird-and-worm" : "鸟虫篆"],
              ].map(([value, label]) => <button className={style === value ? styles.chipActive : styles.chip} key={value} onClick={() => setStyle(value)} type="button">{label}</button>)}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>{english ? "Inscription mode" : "朱白文"}</strong>
            <div className="segmented-control">
              <button className={mode === "yang" ? "segment-button is-selected" : "segment-button"} onClick={() => setMode("yang")} type="button">{english ? "Zhuwen" : "朱文"}</button>
              <button className={mode === "yin" ? "segment-button is-selected" : "segment-button"} onClick={() => setMode("yin")} type="button">{english ? "Baiwen" : "白文"}</button>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>{english ? "Character" : "风格取向"}</strong>
            <div className={styles.chipGrid}>
              {(english ? ["Archaic", "Ordered", "Full field", "Open"] : ['古拙', '工整', '满白', '疏朗']).map((label, index) => <button className={index === 1 ? styles.chipActive : styles.chip} key={label} type="button">{label}</button>)}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>{english ? "Impression effects" : "效果强度"}</strong>
            {[
              [english ? "Distress" : "残损", distress, setDistress], [english ? "Ink variation" : "印泥", ink, setInk], [english ? "Bleed" : "扩散", bleed, setBleed],
            ].map(([label, value, setter]) => (
              <label className={styles.rangeField} key={String(label)}>
                <span>{String(label)}</span>
                <input type="range" min="0" max="100" value={Number(value)} onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))} />
                <output>{Number(value)}%</output>
              </label>
            ))}
          </div>

          <button className={`primary-button ${styles.generate}`} onClick={() => void generate()} type="button">{english ? "Generate 12 candidates" : "生成 12 个方案"}</button>
          <button className="outline-button" disabled={!selectedSource} onClick={() => setStampPlayKey((current) => current + 1)} type="button"><Icon name="stamp" />{english ? "Stamp again" : "重新盖印"}</button>
          <p className="form-status" aria-live="polite">{status}</p>
          </div>
        </aside>

        <section className={`paper-panel ${styles.results}`}>
          <div className={styles.resultsHeader}>
            <h1>{english ? <>Candidates for <span lang="zh-Hans">「{text || "方寸"}」</span></> : <>为「{text || "方寸"}」生成的方案</>}</h1>
            <div>
              <button className="quiet-button" type="button"><Icon name="filter" />{english ? "Filter" : "筛选"}</button>
              <button className="quiet-button" type="button"><Icon name="sort" />{english ? "Sort" : "排序"}</button>
              <button className="quiet-button" type="button"><Icon name="star" />{english ? "Save" : "收藏"}</button>
              <button className="quiet-button" onClick={downloadActiveSvg} type="button"><Icon name="download" />{english ? "Download SVG" : "下载 SVG"}</button>
            </div>
          </div>
          <div className={styles.tabs}>
            {(english ? ["Recommended", "Guxi", "Han seal", "Literati"] : ["推荐", "古玺", "汉印", "文人"]).map((tab) => <button className={activeTab === tab ? styles.tabActive : styles.tab} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}
          </div>
          <details className={styles.sourceLegend}>
            <summary>{english ? "Glyph source notes" : "字形来源说明"}</summary>
            <p><i>{english ? "M" : "补"}</i> {english ? "marks a deterministic modern extension. Unmarked forms prefer traceable sources; full source and license data is available in Studio." : "表示方案含现代篆化补字；未标记项优先使用可追溯字形。完整来源、授权和 Variant 可在专业编辑器内查看。"}</p>
          </details>
          <div className={styles.candidateGrid} aria-label={english ? "Seal candidates" : "候选方案"}>
            {displayCandidates.map(({ source, index }) => (
              <button
                aria-label={english ? `Candidate ${index + 1}, ${candidateLabel(source, locale)}${candidateHasModernGlyph(source) ? ", includes a modern seal-script extension" : ""}` : `方案 ${index + 1}，${candidateLabel(source, locale)}${candidateHasModernGlyph(source) ? "，含现代篆化补字" : ""}`}
                className={selected === index ? styles.candidateActive : styles.candidateCard}
                key={`${source.candidateId}-${index}`}
                onClick={() => setSelected(index)}
                type="button"
              >
                {index === 0 ? <span className={styles.favorite}><Icon name="star" size={18} /></span> : null}
                {candidateHasModernGlyph(source) ? <span className={styles.sourceMark} aria-hidden="true">{english ? "M" : "补"}</span> : null}
                <div className={styles.candidateArtwork}>
                  {index === 0 ? (
                    <FirstStampMotion playKey={stampPlayKey}>
                      <div className="candidate-preview" dangerouslySetInnerHTML={{ __html: source.previewSvg }} />
                    </FirstStampMotion>
                  ) : <div className="candidate-preview" dangerouslySetInnerHTML={{ __html: source.previewSvg }} />}
                </div>
                <span>{candidateLabel(source, locale)}</span>
              </button>
            ))}
          </div>
          <div className={styles.resultFooter}>
            <span>{selectedSource ? (english ? `Candidate ${selected + 1} selected` : `已选择方案 ${selected + 1}`) : (english ? "Select a candidate" : "请选择一个方案")}</span>
            <Link className="primary-button" href={studioHref}>{english ? "Open Studio" : "进入专业编辑器"}<Icon name="arrow" /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}
