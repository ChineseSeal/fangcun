"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { Icon } from "@/components/design-system/icons";
import { GlyphSpecimen } from "@/components/design-system/glyph-specimen";
import { SealImpression } from "@/components/design-system/seal-impression";
import { SealMakingStory } from "@/components/motion/seal-making-story";
import { eventNames, trackEvent } from "@/lib/events";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { Locale } from "@/lib/i18n";
import { isEnglish, localizeHref } from "@/lib/i18n";
import styles from "./home.module.css";

const sealStyles = [
  { code: "han_private", labelEn: "Zhuwen · Square", labelZh: "朱文 · 方印", script: "han_seal", shape: "square" as const, mode: "outline" as const },
  { code: "qin_formal", labelEn: "Zhuwen · Round", labelZh: "朱文 · 圆印", script: "xiaozhuan", shape: "circle" as const, mode: "outline" as const },
  { code: "guxi_warring_states", labelEn: "Baiwen · Full field", labelZh: "白文 · 满白", script: "guxi", shape: "square" as const, mode: "solid" as const },
  { code: "literati_ming_qing", labelEn: "Baiwen · Fine line", labelZh: "白文 · 细朱", script: "xiaozhuan", shape: "square" as const, mode: "outline" as const },
  { code: "bird_worm", labelEn: "Guxi · Irregular", labelZh: "古玺 · 不规则", script: "bird_worm", shape: "irregular" as const, mode: "solid" as const },
  { code: "official_song_yuan", labelEn: "Leisure seal · Tall", labelZh: "闲章 · 书画款", script: "han_seal", shape: "tall" as const, mode: "outline" as const },
] as const;

type PreviewState =
  | { status: "loading"; svgs: Partial<Record<(typeof sealStyles)[number]["code"], string>>; notes: Partial<Record<(typeof sealStyles)[number]["code"], string>> }
  | { status: "ready"; svgs: Partial<Record<(typeof sealStyles)[number]["code"], string>>; notes: Partial<Record<(typeof sealStyles)[number]["code"], string>> }
  | { status: "error"; svgs: Partial<Record<(typeof sealStyles)[number]["code"], string>>; notes: Partial<Record<(typeof sealStyles)[number]["code"], string>> };

const scriptLabels = {
  bird_worm: { en: "Bird-and-worm script", zh: "鸟虫篆" },
  guxi: { en: "Guxi script", zh: "古玺风格" },
  han_seal: { en: "Han seal script", zh: "汉印篆" },
  jiaguwen: { en: "Oracle bone script", zh: "甲骨文" },
  jinwen: { en: "Bronze script", zh: "金文" },
  xiaozhuan: { en: "Small Seal Script", zh: "小篆" },
} as const;

const featureCards = [
  { actionEn: "Explore archive", actionZh: "探索更多", copyEn: "Study verified historic seals and their composition.", copyZh: "观古人印迹，悟篆刻之美", href: "/seals", titleEn: "Seal Archive", titleZh: "历史印谱", icon: "book" as const },
  { actionEn: "Open dictionary", actionZh: "立即查询", copyEn: "Trace seal-script forms, sources, and modern extensions.", copyZh: "查篆书字形，知源流演变", href: "/dictionary", titleEn: "Script Dictionary", titleZh: "篆书字典", icon: "search" as const },
  { actionEn: "View gallery", actionZh: "查看今日印章", copyEn: "Browse contemporary work built from the same seal system.", copyZh: "每日欣赏一方好印", href: "/gallery", titleEn: "Seal Gallery", titleZh: "今日一印", icon: "image" as const },
];

export function HomePage({ locale }: { locale: Locale }) {
  const english = isEnglish(locale);
  const [text, setText] = useState("");
  const [styleCode, setStyleCode] = useState<(typeof sealStyles)[number]["code"]>("han_private");
  const [preview, setPreview] = useState<PreviewState>({ status: "loading", svgs: {}, notes: {} });
  const selectedStyle = sealStyles.find((item) => item.code === styleCode) ?? sealStyles[0];
  const livePreviewEnabled = isFeatureEnabled("home.livePreview");
  const scrollNarrativeEnabled = isFeatureEnabled("motion.scrollNarrative");
  const createHref = `${localizeHref("/create", locale)}?${new URLSearchParams({
    text: text || "方寸",
    style: selectedStyle.code,
    mode: selectedStyle.mode === "solid" ? "yin" : "yang",
  }).toString()}`;

  useEffect(() => {
    if (!livePreviewEnabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreview((current) => ({ status: "loading", svgs: current.svgs, notes: current.notes }));
      try {
        const entries = await Promise.all(sealStyles.map(async (item) => {
          const response = await fetch("/api/seals/generate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              text: text || "方寸",
              style: item.code,
              script: item.script,
              mode: item.mode === "solid" ? "yin" : "yang",
              locale,
            }),
            signal: controller.signal,
          });
          const data = (await response.json()) as { candidates?: Array<{
            explain: { glyphSources: Array<{ script: keyof typeof scriptLabels }> };
            previewSvg: string;
            warnings: string[];
          }> };
          const candidate = data.candidates?.[0];
          const svg = candidate?.previewSvg;
          if (!response.ok || !svg) throw new Error("preview unavailable");
          const actualScripts = Array.from(new Set(candidate.explain.glyphSources.map((source) => source.script)));
          const note = candidate.warnings.some((warning) => warning.startsWith("MODERN_SEALIZATION"))
            ? english ? "Modern extension" : "现代扩展"
            : actualScripts.length === 1 && actualScripts[0] !== item.script
              ? `${scriptLabels[actualScripts[0]][english ? "en" : "zh"]}${english ? " fallback" : "回退"}`
              : actualScripts.length > 1
                ? english ? "Mixed scripts" : "混合字形"
                : "";
          return [item.code, { note, svg }] as const;
        }));
        setPreview({
          status: "ready",
          svgs: Object.fromEntries(entries.map(([code, entry]) => [code, entry.svg])),
          notes: Object.fromEntries(entries.map(([code, entry]) => [code, entry.note])),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPreview((current) => ({ status: "error", svgs: current.svgs, notes: current.notes }));
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [english, livePreviewEnabled, locale, text]);

  function beginCreation() {
    trackEvent(eventNames.sealGenerateClicked, {
      characterCount: Array.from(text).length,
      style: selectedStyle.code,
    });
  }

  return (
    <div className="paper-page">
      <SiteHeader locale={locale} />
      <main className={`page-container ${styles.home}`}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroLead}>
            <div className={styles.brushMark} aria-hidden="true">
              <span><GlyphSpecimen character="印" /></span>
              <i>方寸</i>
            </div>
            <div className={styles.heroCopy}>
              <h1 id="home-title">{english ? "A world within an inch." : "方寸之间，自有天地。"}</h1>
              <span className={styles.redRule} />
              <label className="sr-only" htmlFor="home-seal-text">{english ? "Enter the inscription for your seal" : "输入你想刻下的文字"}</label>
              <input
                className={`paper-input ${styles.heroInput}`}
                id="home-seal-text"
                maxLength={8}
                onChange={(event) => {
                  if (event.target.value && !text) trackEvent(eventNames.homeInputStarted);
                  setText(event.target.value.slice(0, 8));
                }}
                placeholder={english ? "Enter up to 8 Chinese characters, for example 清风明月" : "输入你想刻下的文字，例如：清风明月"}
                value={text}
              />
              <div className={styles.heroActions}>
                <Link className={`primary-button ${styles.generateButton}`} href={createHref} onClick={beginCreation}>
                  {english ? "Create my seal" : "生成我的印章"}
                  <span className={styles.miniSeal}><GlyphSpecimen character="印" /></span>
                </Link>
                <Link className="outline-button" href={english ? localizeHref("/academy", locale) : "/ai"}><Icon name="feather" />{english ? "Learn seal craft" : "体验 AI 篆刻师"}</Link>
              </div>
              <div className={styles.heroBenefits}>
                <span><Icon name="feather" size={16} />{english ? "Deterministic generation" : "AI 智能生成"}</span><b>·</b><span><Icon name="star" size={16} />{english ? "Traceable glyphs" : "专业篆刻风格"}</span><b>·</b><span><Icon name="download" size={16} />{english ? "SVG and PNG export" : "高清印蜕下载"}</span>
              </div>
            </div>
          </div>

          <div className={styles.previewArea} aria-label={english ? "Generated Chinese seal previews" : "AI 生成印章预览"}>
            <div className={styles.previewHeading}>
              <h2>{english ? "Generated seal previews" : "AI 生成印章预览"}</h2>
              <span />
              <button type="button" onClick={() => setText((current) => current || "清风明月")}><Icon name="shuffle" size={16} />{english ? "Try sample" : "换一批"}</button>
            </div>
            <div className={styles.previewGrid}>
              {sealStyles.map((item, index) => (
                <button
                  type="button"
                  className={item.code === selectedStyle.code ? styles.previewCardActive : styles.previewCard}
                  key={item.code}
                  onClick={() => setStyleCode(item.code)}
                  aria-pressed={item.code === selectedStyle.code}
                >
                  <div className={styles.previewSeal}>
                    {preview.svgs[item.code] ? (
                      <div className={item.code === selectedStyle.code ? "seal-preview-engine" : "seal-preview-engine-item"} dangerouslySetInnerHTML={{ __html: preview.svgs[item.code] ?? "" }} />
                    ) : (
                      <SealImpression locale={locale} mode={item.mode} shape={item.shape} text={["书画雅集", "宗民雅正", "元亨利贞", "载文载道", "清和", "闲云"][index]} />
                    )}
                  </div>
                  <span>{index + 1}. {english ? item.labelEn : item.labelZh}{preview.notes[item.code] ? <i aria-label={preview.notes[item.code]}>{english ? "M" : "补"}</i> : null}</span>
                </button>
              ))}
            </div>
            <p className={styles.sourceLegend}><i>{english ? "M" : "补"}</i> {english ? "marks a deterministic modern seal-script extension. Source details remain available in Studio." : "表示该方案含明确标注的现代篆化补字；详细来源可在编辑器中查看。"}</p>
            <p className={styles.previewStatus} aria-live="polite">
              {preview.status === "loading" ? (english ? "Building seal forms..." : "正在篆化…") : preview.status === "error" ? (english ? "Preview unavailable" : "预览暂不可用") : `${english ? "Selected" : "当前"}：${english ? selectedStyle.labelEn : selectedStyle.labelZh}${preview.notes[selectedStyle.code] ? ` · ${preview.notes[selectedStyle.code]}` : ""}`}
            </p>
          </div>
        </section>

        {scrollNarrativeEnabled && !english ? (
          <SealMakingStory previewSvg={preview.svgs[selectedStyle.code]} />
        ) : null}

        <section className={styles.featureGrid} id="about" aria-label={english ? "Explore Fangcun" : "探索方寸"}>
          {featureCards.map((card, index) => (
            <Link className={styles.featureCard} href={localizeHref(card.href, locale)} key={card.href}>
              <div>
                <Icon name={card.icon} size={23} />
                <h2>{english ? card.titleEn : card.titleZh}</h2>
                <p>{english ? card.copyEn : card.copyZh}</p>
                <span>{english ? card.actionEn : card.actionZh}<Icon name="arrow" size={17} /></span>
              </div>
              {index === 0 ? <Image alt={english ? "Historic seal catalogue" : "古印谱"} height={120} src="/images/seal-catalog.webp" width={150} /> : <SealImpression locale={locale} shape={index === 1 ? "square" : "tall"} text={index === 1 ? "印" : "庵藏图书"} />}
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
