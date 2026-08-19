"use client";

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import {
  CARVING_DPI,
  injectPngDensity,
  type CarvingGuidance,
  type CarvingProof,
} from "@fangcun/carving-aid";
import type { SealDsl } from "@fangcun/dsl-schema";
import { Icon } from "@/components/design-system/icons";
import { SiteHeader } from "@/components/design-system/site-header";
import { SideInscriptionEditor } from "@/components/experiences/studio/side-inscription-editor";
import { TermPopover, TermRichText } from "@/components/knowledge/term-popover";
import { Seal3dViewer } from "@/components/seal-3d/seal-3d-viewer";
import { formatExplainFacts, type ExplainFacts } from "@fangcun/seal-engine";
import { recordAchievementEvent } from "@/lib/achievement-store";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { Locale } from "@/lib/i18n";
import { formatDimensionsMillimeters, formatLocalDateTime, formatMillimeters, isEnglish, localizeHref } from "@/lib/i18n";
import { createSealPng, downloadBlob, rasterizeSvg, type PngBackground } from "@/lib/export-png";
import { createInscriptionRubbingSvg } from "@/lib/side-inscription";
import {
  commitStudioHistory,
  createStudioHistory,
  redoStudioHistory,
  type StudioHistory,
  undoStudioHistory,
} from "@/lib/studio-history";
import {
  createProject,
  duplicateProject,
  findProject,
  getProjectCurrentVersion,
  getVisibleProjectVersions,
  migrateLegacyStudioDraft,
  PROJECT_VERSION_REASON_LABELS,
  readProjectDraft,
  restoreProjectVersion,
  saveProjectVersion,
  writeProjectDraft,
  type ProjectVersionReason,
  type SealProject,
  type SealProjectVersion,
} from "@/lib/project-store";
import styles from "./studio.module.css";

const englishScriptLabels: Record<SealDsl["script"], string> = {
  xiaozhuan: "Small Seal Script",
  han_seal: "Han seal",
  guxi: "Guxi",
  bird_worm: "Bird-and-worm script",
  jinwen: "Bronze script",
  jiaguwen: "Oracle bone script",
};

const englishMaterialLabels: Record<SealDsl["physical"]["material"], string> = {
  qingtian: "Qingtian stone",
  shoushan: "Shoushan stone",
  changhua: "Changhua stone",
  bahrain: "Balin stone",
  copper: "Copper",
  jade: "Jade",
  wood: "Wood",
  ceramic: "Ceramic",
  other: "plain stone",
};

const englishLayoutLabels: Record<string, string> = {
  freeform: "free composition (zhangfa)",
  grid_2x2: "four-character grid composition (zhangfa)",
  guxi_3: "three-character Guxi composition (zhangfa)",
  horizontal_2: "two-character horizontal composition (zhangfa)",
  horizontal_3: "three-character horizontal composition (zhangfa)",
  huiwen: "huiwen reading composition (zhangfa)",
  ring: "ring composition (zhangfa)",
  single: "centered single-character composition (zhangfa)",
  two_col: "two-column composition (zhangfa)",
  vertical_2: "two-character vertical composition (zhangfa)",
  vertical_3: "three-character vertical composition (zhangfa)",
};

const englishVersionReasons: Record<ProjectVersionReason, string> = {
  initial: "Initial version",
  manual: "Manual save",
  autosave: "Autosave",
  export: "Export snapshot",
  style_change: "Style adjustment",
  inscription_change: "Side-inscription adjustment",
  material_change: "Material adjustment",
  variant_change: "Glyph adjustment",
  impression_change: "New impression",
  restore: "History restore",
};

type StudioStatus = "loading" | "ready" | "error" | "offline";

type GlyphVariantOption = {
  id: string;
  character: string;
  script: SealDsl["script"];
  svgPath: string;
  viewBox: "0 0 1000 1000";
  source: string;
  license: string;
  confidence: "attested" | "inferred" | "generated";
  recommended: boolean;
};

const scriptLabels: Record<SealDsl["script"], string> = {
  xiaozhuan: "小篆",
  han_seal: "汉印篆",
  guxi: "古玺",
  bird_worm: "鸟虫篆",
  jinwen: "金文",
  jiaguwen: "甲骨文",
};

const layoutOptions = {
  "zh-Hans": [
    { label: "纵列", value: "vertical_2" },
    { label: "横列", value: "horizontal_2" },
    { label: "回环", value: "ring" },
    { label: "方格", value: "grid_2x2" },
    { label: "自由", value: "freeform" },
  ],
  en: [
    { label: "Vertical", value: "vertical_2" },
    { label: "Horizontal", value: "horizontal_2" },
    { label: "Huiwen", value: "ring" },
    { label: "Grid", value: "grid_2x2" },
    { label: "Free", value: "freeform" },
  ],
} as const;

const borderOptions = {
  "zh-Hans": [
    { label: "无框", value: "none" },
    { label: "细框", value: "single" },
    { label: "厚框", value: "thick" },
    { label: "双框", value: "double" },
    { label: "残框", value: "irregular" },
  ],
  en: [
    { label: "None", value: "none" },
    { label: "Fine", value: "single" },
    { label: "Heavy", value: "thick" },
    { label: "Double", value: "double" },
    { label: "Worn", value: "irregular" },
  ],
} as const satisfies Record<Locale, ReadonlyArray<{ label: string; value: SealDsl["border"]["type"] }>>;

const layoutStrategyLabels: Record<string, string> = {
  freeform: "自由章法",
  grid_2x2: "四字方格",
  guxi_3: "古玺三字",
  horizontal_2: "两字横排",
  horizontal_3: "三字横排",
  huiwen: "回文章法",
  ring: "环形章法",
  single: "单字居中",
  two_col: "双列章法",
  vertical_2: "两字纵排",
  vertical_3: "三字纵排",
};

function formatLayoutStrategy(strategy: string | undefined, locale: Locale = "zh-Hans"): string {
  if (!strategy) return "—";
  return isEnglish(locale) ? englishLayoutLabels[strategy] ?? "custom composition (zhangfa)" : layoutStrategyLabels[strategy] ?? "自定义章法";
}

function numericSearchParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function StudioPage({ locale }: { locale: Locale }) {
  const english = isEnglish(locale);
  const copy = useCallback(
    (chinese: string, englishText: string) => english ? englishText : chinese,
    [english],
  );
  const [history, setHistory] = useState<StudioHistory<SealDsl> | null>(null);
  const [svg, setSvg] = useState("");
  const [explain, setExplain] = useState<ExplainFacts | null>(null);
  const [status, setStatus] = useState<StudioStatus>("loading");
  const [statusMessage, setStatusMessage] = useState(english ? "Loading candidate..." : "正在载入候选方案…");
  const [showGrid, setShowGrid] = useState(true);
  const [stageMode, setStageMode] = useState<"impression" | "carving" | "stone">("impression");
  const [carvingProof, setCarvingProof] = useState<CarvingProof | null>(null);
  const [carvingGuidance, setCarvingGuidance] = useState<CarvingGuidance | null>(null);
  const [carvingStatus, setCarvingStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [realSizePreview, setRealSizePreview] = useState(false);
  const [online, setOnline] = useState(true);
  const [selectedGlyphIndex, setSelectedGlyphIndex] = useState(0);
  const [glyphVariants, setGlyphVariants] = useState<GlyphVariantOption[]>([]);
  const [variantStatus, setVariantStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [exporting, setExporting] = useState<"svg" | "inscription-rubbing" | "carving-svg" | "carving-png" | "carving-pdf" | PngBackground | null>(null);
  const [project, setProject] = useState<SealProject | null>(null);
  const [engineVersion, setEngineVersion] = useState("0.1.0");
  const [assetVersion, setAssetVersion] = useState("unknown");
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewRotation, setPreviewRotation] = useState(0);
  const dsl = history?.present;
  const selectedCharacter = dsl ? Array.from(dsl.text)[selectedGlyphIndex] ?? "" : "";
  const selectedGlyph = dsl?.glyphs[selectedGlyphIndex];
  const selectedScript = dsl?.script;
  const viewer3dEnabled = isFeatureEnabled("viewer3d.enabled");
  const visibleVersions = project ? getVisibleProjectVersions(project) : [];

  useEffect(() => {
    const updateOnlineState = () => setOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!dsl || selectedGlyphIndex < dsl.glyphs.length) return;
    setSelectedGlyphIndex(0);
  }, [dsl, selectedGlyphIndex]);

  useEffect(() => {
    if (!selectedCharacter || !selectedScript) {
      setGlyphVariants([]);
      setVariantStatus("idle");
      return;
    }
    const controller = new AbortController();
    setVariantStatus("loading");
    void fetch(
      `/api/glyphs/variants?char=${encodeURIComponent(selectedCharacter)}&script=${encodeURIComponent(selectedScript)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = (await response.json()) as { variants?: GlyphVariantOption[] };
        if (!response.ok || !data.variants) throw new Error("variants unavailable");
        setGlyphVariants(data.variants);
        setVariantStatus(data.variants.length ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGlyphVariants([]);
        setVariantStatus("error");
      });
    return () => controller.abort();
  }, [selectedCharacter, selectedScript]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const migratedDraft = migrateLegacyStudioDraft(window.localStorage);
    const requestedProjectId = params.get("projectId");
    const storedProject = requestedProjectId
      ? findProject(window.localStorage, requestedProjectId)
      : null;
    if (storedProject) {
      const version = getProjectCurrentVersion(storedProject);
      const draft = readProjectDraft(window.localStorage, storedProject.id);
      const useDraft = draft && draft.updatedAt > storedProject.updatedAt;
      setProject(storedProject);
      setEngineVersion(useDraft ? draft.engineVersion : version.engineVersion);
      setAssetVersion(useDraft ? draft.assetVersion : version.assetVersion);
      setHistory(createStudioHistory(useDraft ? draft.dsl : version.dsl));
      setStatus("ready");
      setStatusMessage(useDraft
        ? copy("已恢复此项目尚未保存的本地草稿。", "Restored the unsaved local draft for this project.")
        : copy(`已打开「${storedProject.name}」。`, `Opened “${storedProject.name}”.`));
      return () => controller.abort();
    }
    if (params.size === 0 && migratedDraft) {
      setEngineVersion(migratedDraft.engineVersion);
      setAssetVersion(migratedDraft.assetVersion);
      setHistory(createStudioHistory(migratedDraft.dsl));
      setStatus("ready");
      setStatusMessage(copy("已恢复上次未保存的本地草稿。", "Restored your last unsaved local draft."));
      return () => controller.abort();
    }
    const seed = numericSearchParam(params, "seed");
    const density = numericSearchParam(params, "density");
    const borderWidth = numericSearchParam(params, "borderWidth");
    const distress = numericSearchParam(params, "distress");
    const inkUneven = numericSearchParam(params, "inkUneven");
    const candidateIndex = Math.max(0, Math.min(2, Number(params.get("candidate")) || 0));
    const script = params.get("script");
    const shape = params.get("shape");
    const layout = params.get("layout");
    const readingOrder = params.get("readingOrder");
    const border = params.get("border");
    const sourceSealId = params.get("sourceSealId");
    const requestBody = {
      locale,
      text: params.get("text") || "听雨",
      style: params.get("style") || "han_private",
      mode: params.get("mode") === "yang" ? "yang" : "yin",
      ...(script ? { script } : {}),
      ...(shape ? { shape: { type: shape } } : {}),
      ...(layout || density !== undefined || readingOrder ? {
        layout: {
          ...(layout ? { strategy: layout } : {}),
          ...(density !== undefined ? { density } : {}),
          ...(readingOrder ? { readingOrder } : {}),
        },
      } : {}),
      ...(border || borderWidth !== undefined ? {
        border: {
          ...(border ? { type: border } : {}),
          ...(borderWidth !== undefined ? { width: borderWidth } : {}),
        },
      } : {}),
      ...(seed !== undefined || distress !== undefined || inkUneven !== undefined ? {
        impression: {
          ...(seed !== undefined ? { seed } : {}),
          ...(distress !== undefined ? { distress } : {}),
          ...(inkUneven !== undefined ? { inkUneven } : {}),
        },
      } : {}),
      ...(sourceSealId && /^[a-z0-9-]{1,80}$/.test(sourceSealId) ? {
        meta: { sourceSealId },
      } : {}),
    };

    async function loadCandidate() {
      try {
        const response = await fetch("/api/seals/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          candidates?: Array<{ dsl: SealDsl; previewSvg: string; explain: ExplainFacts }>;
          engineVersion?: string;
          assetVersion?: string;
        };
        const candidate = data.candidates?.[candidateIndex] ?? data.candidates?.[0];
        if (!response.ok || !candidate) throw new Error("candidate unavailable");
        setHistory(createStudioHistory(candidate.dsl));
        setSvg(candidate.previewSvg);
        setExplain(candidate.explain);
        setEngineVersion(data.engineVersion ?? "0.1.0");
        setAssetVersion(data.assetVersion ?? "unknown");
        setStatus("ready");
        setStatusMessage(copy("候选已载入，可开始调整。", "Candidate loaded. You can start editing."));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus(navigator.onLine ? "error" : "offline");
        setStatusMessage(navigator.onLine
          ? copy("候选载入失败，请返回生成器重试。", "The candidate could not be loaded. Return to Create and try again.")
          : copy("当前离线，恢复网络后会自动重试。", "You are offline. The candidate will retry when the connection returns."));
      }
    }

    void loadCandidate();
    return () => controller.abort();
  }, [copy, locale]);

  useEffect(() => {
    if (!dsl) return;
    if (!online) {
      setStatus("offline");
      setStatusMessage(copy("当前离线，已保留最近一次印面与本地编辑状态。", "You are offline. The latest seal impression and local edits are preserved."));
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setStatusMessage(copy("正在重绘印面…", "Rendering the seal impression..."));
      try {
        const response = await fetch("/api/seals/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dsl, locale }),
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          svg?: string;
          explain?: ExplainFacts;
          engineVersion?: string;
          assetVersion?: string;
        };
        if (!response.ok || !data.svg) throw new Error("render unavailable");
        setSvg(data.svg);
        setExplain(data.explain ?? null);
        setEngineVersion(data.engineVersion ?? engineVersion);
        setAssetVersion(data.assetVersion ?? assetVersion);
        setStatus("ready");
        setStatusMessage(copy("印面已更新，本地草稿将自动保存。", "Seal impression updated. The local draft will be saved automatically."));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus(navigator.onLine ? "error" : "offline");
        setStatusMessage(navigator.onLine
          ? copy("重绘失败，已保留上一次预览。", "Rendering failed. The previous preview is preserved.")
          : copy("当前离线，已保留上一次预览。", "You are offline. The previous preview is preserved."));
      }
    }, 80);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [assetVersion, copy, dsl, engineVersion, locale, online]);

  useEffect(() => {
    if (!dsl || stageMode !== "carving") return;
    const controller = new AbortController();
    setCarvingStatus("loading");
    void fetch("/api/carving-aid", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dsl }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          proof?: CarvingProof;
          guidance?: CarvingGuidance;
        };
        if (!response.ok || !data.ok || !data.proof || !data.guidance) {
          throw new Error("carving proof unavailable");
        }
        setCarvingProof(data.proof);
        setCarvingGuidance(data.guidance);
        setCarvingStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCarvingStatus("error");
      });
    return () => controller.abort();
  }, [dsl, stageMode]);

  useEffect(() => {
    if (!dsl) return;
    const timer = window.setTimeout(() => {
      writeProjectDraft(window.localStorage, project?.id ?? null, dsl, { engineVersion, assetVersion });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [assetVersion, dsl, engineVersion, project]);

  useEffect(() => {
    if (!dsl || !project) return;
    const timer = window.setTimeout(() => {
      const result = saveProjectVersion(window.localStorage, project.id, dsl, {
        reason: "autosave",
        engineVersion,
        assetVersion,
      });
      if (result.ok && result.created) {
        setProject(result.project);
        setStatusMessage(copy("项目已自动保存为新版本。", "Project autosaved as a new version."));
      }
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [assetVersion, copy, dsl, engineVersion, project]);

  useEffect(() => {
    if (!dsl || !project) return;
    const saveBeforeLeaving = () => {
      saveProjectVersion(window.localStorage, project.id, dsl, {
        reason: "autosave",
        engineVersion,
        assetVersion,
      });
    };
    window.addEventListener("beforeunload", saveBeforeLeaving);
    return () => window.removeEventListener("beforeunload", saveBeforeLeaving);
  }, [assetVersion, dsl, engineVersion, project]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editingText = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistory((current) => current ? (event.shiftKey ? redoStudioHistory(current) : undoStudioHistory(current)) : current);
        return;
      }
      if (editingText || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setStageMode("carving");
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setStageMode("carving");
        setRealSizePreview((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function persistVersion(nextDsl: SealDsl, reason: ProjectVersionReason): SealProjectVersion | null {
    if (!project) return null;
    const result = saveProjectVersion(window.localStorage, project.id, nextDsl, {
      reason,
      engineVersion,
      assetVersion,
    });
    if (!result.ok) return null;
    setProject(result.project);
    return result.version;
  }

  function updateDsl(update: (current: SealDsl) => SealDsl, reason?: ProjectVersionReason) {
    if (!dsl) return;
    const next = update(dsl);
    if (JSON.stringify(next) === JSON.stringify(dsl)) return;
    setHistory((current) => current ? commitStudioHistory(current, next) : current);
    if (reason && project) persistVersion(next, reason);
  }

  function commitInscription(inscription: SealDsl["inscription"]) {
    if (!dsl) return;
    const next = { ...dsl, inscription };
    if (project) persistVersion(next, "inscription_change");
  }

  function selectGlyphVariant(variantId: string) {
    updateDsl((current) => ({
      ...current,
      glyphs: current.glyphs.map((glyph, index) =>
        index === selectedGlyphIndex ? { ...glyph, variantId } : glyph,
      ),
    }), "variant_change");
  }

  function toggleGlyphLock() {
    updateDsl((current) => ({
      ...current,
      glyphs: current.glyphs.map((glyph, index) =>
        index === selectedGlyphIndex ? { ...glyph, locked: !glyph.locked } : glyph,
      ),
    }), "variant_change");
  }

  function updateProjectUrl(projectId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("projectId", projectId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function saveProject() {
    if (!dsl) return;
    const result = project
      ? saveProjectVersion(window.localStorage, project.id, dsl, {
          reason: "manual",
          engineVersion,
          assetVersion,
        })
      : createProject(window.localStorage, dsl, {
          name: `${dsl.text}印`,
          engineVersion,
          assetVersion,
        });
    if (!result.ok) {
      setStatusMessage(result.reason === "PROJECT_LIMIT"
        ? copy("本地最多保存 5 个项目，请先到项目页归档或整理。", "Local storage supports up to five projects. Archive or organize one before saving.")
        : copy("项目保存失败，请稍后重试。", "The project could not be saved. Try again shortly."));
      return;
    }
    setProject(result.project);
    updateProjectUrl(result.project.id);
    setStatus("ready");
    setStatusMessage(result.created
      ? copy(`已保存为版本 ${result.version.number}。`, `Saved as version ${result.version.number}.`)
      : copy("当前内容已经保存。", "The current version is already saved."));
  }

  function copyProject() {
    if (!dsl) return;
    const result = project
      ? duplicateProject(window.localStorage, project.id)
      : createProject(window.localStorage, dsl, {
          name: english ? `${dsl.text} seal copy` : `${dsl.text}印 副本`,
          engineVersion,
          assetVersion,
        });
    if (!result.ok) {
      setStatusMessage(result.reason === "PROJECT_LIMIT"
        ? copy("本地项目已达到 5 个上限，暂时无法复制。", "The five-project local limit has been reached, so this project cannot be copied yet.")
        : copy("项目复制失败，请稍后重试。", "The project could not be copied. Try again shortly."));
      return;
    }
    setProject(result.project);
    setHistory(createStudioHistory(result.version.dsl));
    updateProjectUrl(result.project.id);
    setStatus("ready");
    setStatusMessage(copy(`已创建「${result.project.name}」。`, `Created “${result.project.name}”.`));
  }

  function restoreVersion(versionId: string) {
    if (!project || project.currentVersionId === versionId) return;
    const result = restoreProjectVersion(window.localStorage, project.id, versionId, {
      engineVersion,
      assetVersion,
    });
    if (!result.ok) {
      setStatusMessage(copy("版本恢复失败，原有历史没有被改动。", "Version restore failed. The existing history was not changed."));
      return;
    }
    setProject(result.project);
    setHistory(createStudioHistory(result.version.dsl));
    setStatus("ready");
    setStatusMessage(copy(
      `已从历史恢复并创建版本 ${result.version.number}；后续版本仍完整保留。`,
      `Restored from history as version ${result.version.number}. Later versions remain intact.`,
    ));
  }

  function renderVersionHistory() {
    return (
      <div className={styles.historyList}>
        {visibleVersions.map((version) => (
          <button
            aria-label={`${version.name}${copy("，", ", ")}${version.id === project?.currentVersionId ? copy("当前版本", "current version") : copy("恢复此版本", "restore this version")}`}
            className={version.id === project?.currentVersionId ? styles.historyActive : styles.historyItem}
            key={version.id}
            onClick={() => restoreVersion(version.id)}
            type="button"
          >
            <span aria-hidden="true" className={styles.versionSeal} lang="zh-Hans">{version.dsl.text.slice(0, 2)}</span>
            <span>{copy("版本", "Version")} {version.number}{version.id === project?.currentVersionId ? copy("（当前）", " (current)") : ""}<small>{english ? englishVersionReasons[version.reason] : PROJECT_VERSION_REASON_LABELS[version.reason]} · {formatLocalDateTime(version.createdAt, locale)}</small></span>
          </button>
        ))}
        {!project ? <p className={styles.historyEmpty}>{copy("保存项目后，这里会显示可恢复的版本快照。", "Save the project to create restorable version snapshots.")}</p> : null}
      </div>
    );
  }

  function selectGlyphFromPreview(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dsl) return;
    const target = event.target instanceof Element ? event.target.closest("[data-char]") : null;
    const character = target?.getAttribute("data-char");
    const index = character ? Array.from(dsl.text).indexOf(character) : -1;
    if (index >= 0) setSelectedGlyphIndex(index);
  }

  async function exportSvg() {
    if (!dsl) return;
    setExporting("svg");
    setStatusMessage(copy("正在准备 SVG…", "Preparing SVG..."));
    try {
      const response = await fetch("/api/seals/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dsl }),
      });
      if (!response.ok) throw new Error("export unavailable");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "fangcun-seal.svg";
      anchor.click();
      URL.revokeObjectURL(url);
      persistVersion(dsl, "export");
      setStatusMessage(copy("SVG 已导出；导出不会改变编辑历史。", "SVG exported. Export does not change edit history."));
    } catch {
      setStatusMessage(navigator.onLine
        ? copy("导出失败，请稍后重试。", "Export failed. Try again shortly.")
        : copy("当前离线，恢复网络后可导出。", "You are offline. Export will be available when the connection returns."));
    } finally {
      setExporting(null);
    }
  }

  async function exportPng(background: PngBackground) {
    if (!dsl) return;
    setExporting(background);
    setStatusMessage(background === "transparent"
      ? copy("正在生成透明 PNG…", "Generating transparent PNG...")
      : copy("正在生成纸色 PNG…", "Generating paper-background PNG..."));
    try {
      const png = await createSealPng(dsl, background, 1000);
      downloadBlob(png, background === "transparent" ? "fangcun-seal-transparent.png" : "fangcun-seal.png");
      persistVersion(dsl, "export");
      setStatusMessage(copy(
        `${background === "transparent" ? "透明 PNG" : "PNG"} 已导出；主体几何来自当前权威 SVG。`,
        `${background === "transparent" ? "Transparent PNG" : "PNG"} exported. Its geometry comes from the current authoritative SVG.`,
      ));
    } catch {
      setStatusMessage(navigator.onLine
        ? copy("PNG 导出失败，请稍后重试。", "PNG export failed. Try again shortly.")
        : copy("当前离线，恢复网络后可导出。", "You are offline. Export will be available when the connection returns."));
    } finally {
      setExporting(null);
    }
  }

  function exportInscriptionRubbing() {
    if (!dsl) return;
    setExporting("inscription-rubbing");
    try {
      const rubbing = createInscriptionRubbingSvg(dsl);
      downloadBlob(
        new Blob([rubbing], { type: "image/svg+xml;charset=utf-8" }),
        `fangcun-side-inscription-${dsl.inscription.faces?.length ?? 1}-faces.svg`,
      );
      persistVersion(dsl, "export");
      setStatusMessage(copy(
        "边款拓片 SVG 已导出；黑底白字稿保留每面的方位、书体和刀法标注。",
        "Side-inscription rubbing SVG exported with face, script, and knife-style labels.",
      ));
    } catch {
      setStatusMessage(copy(
        "请先输入至少一面边款，再导出拓片。",
        "Enter an inscription on at least one face before exporting a rubbing.",
      ));
    } finally {
      setExporting(null);
    }
  }

  function exportCarvingSheetSvg() {
    if (!carvingProof || !dsl) return;
    setExporting("carving-svg");
    try {
      downloadBlob(
        new Blob([carvingProof.sheetSvg], { type: "image/svg+xml;charset=utf-8" }),
        `fangcun-carving-proof-${dsl.physical.sizeMm}mm.svg`,
      );
      persistVersion(dsl, "export");
      setStatusMessage(copy(
        "刻制辅助 SVG 已导出；打印时请选择 100% / 实际大小并核对 10 mm 标尺。",
        "Carving SVG exported. Print at 100% / actual size and verify the 10mm scale.",
      ));
      recordAchievementEvent({
        event: "carving_exported",
        eventKey: `carving-export:${project?.id ?? "anonymous"}:svg:${Date.now()}`,
        format: "svg",
      });
    } finally {
      setExporting(null);
    }
  }

  async function exportCarvingPng() {
    if (!carvingProof || !dsl) return;
    setExporting("carving-png");
    setStatusMessage(copy(`正在生成 ${CARVING_DPI} dpi 反字 PNG…`, `Generating ${CARVING_DPI} dpi mirrored PNG...`));
    try {
      const png = await rasterizeSvg(carvingProof.mirroredSvg, carvingProof.pixelsAt300Dpi);
      const bytes = injectPngDensity(new Uint8Array(await png.arrayBuffer()), CARVING_DPI);
      const pngBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pngBuffer).set(bytes);
      downloadBlob(
        new Blob([pngBuffer], { type: "image/png" }),
        `fangcun-carving-mirror-${dsl.physical.sizeMm}mm-300dpi.png`,
      );
      persistVersion(dsl, "export");
      setStatusMessage(copy(
        "反字 PNG 已导出；文件写入 300 dpi 尺寸元数据，刻制前请再次核对正反。",
        "Mirrored PNG exported with 300 dpi size metadata. Verify normal and mirrored sides before carving.",
      ));
      recordAchievementEvent({
        event: "carving_exported",
        eventKey: `carving-export:${project?.id ?? "anonymous"}:png:${Date.now()}`,
        format: "png",
      });
    } catch {
      setStatusMessage(copy("反字 PNG 导出失败，请稍后重试。", "Mirrored PNG export failed. Try again shortly."));
    } finally {
      setExporting(null);
    }
  }

  async function exportCarvingPdf() {
    if (!carvingProof || !dsl) return;
    setExporting("carving-pdf");
    setStatusMessage(copy("正在生成 1:1 矢量 PDF…", "Generating a 1:1 vector PDF..."));
    try {
      const response = await fetch("/api/carving-aid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dsl, output: "pdf" }),
      });
      if (!response.ok) throw new Error("PDF export unavailable");
      downloadBlob(
        await response.blob(),
        `fangcun-carving-proof-${dsl.physical.sizeMm}mm.pdf`,
      );
      persistVersion(dsl, "export");
      setStatusMessage(copy(
        "1:1 PDF 已导出；打印时请选择 100% / 实际大小，并用尺子核对 10 mm 标尺。",
        "1:1 PDF exported. Print at 100% / actual size and verify the 10mm scale with a ruler.",
      ));
      recordAchievementEvent({
        event: "carving_exported",
        eventKey: `carving-export:${project?.id ?? "anonymous"}:pdf:${Date.now()}`,
        format: "pdf",
      });
    } catch {
      setStatusMessage(navigator.onLine
        ? copy("PDF 导出失败，请稍后重试。", "PDF export failed. Try again shortly.")
        : copy("当前离线，恢复网络后可导出 PDF。", "You are offline. PDF export will be available when the connection returns."));
    } finally {
      setExporting(null);
    }
  }

  const explainPresentation = explain ? formatExplainFacts(explain, locale) : null;
  const presetLabels = english
    ? ["Archaic", "Refined", "Lean", "Rounded", "Weighty", "Taut"]
    : ["古拙", "典雅", "清劲", "圆润", "浑厚", "劲挺"];
  const rangeSettings: Array<[string, string, number, (value: number) => void]> = [
    [copy("古拙", "Archaic weight"), "", dsl?.layout.density ?? 0.76, (value) => updateDsl((current) => ({ ...current, layout: { ...current.layout, density: value } }))],
    [copy("疏密", "Composition density"), "zhangfa", dsl?.layout.density ?? 0.76, (value) => updateDsl((current) => ({ ...current, layout: { ...current.layout, density: value } }))],
    [copy("残损", "Distress"), "cansun", dsl?.impression.distress ?? 0.24, (value) => updateDsl((current) => ({ ...current, impression: { ...current.impression, distress: value } }))],
    [copy("印泥", "Ink variation"), "yinni", dsl?.impression.inkUneven ?? 0.71, (value) => updateDsl((current) => ({ ...current, impression: { ...current.impression, inkUneven: value } }))],
  ];

  return (
    <div className="paper-page">
      <SiteHeader locale={locale} />
      <main className={`page-container paper-panel ${styles.editor}`}>
        <div className={styles.editorTopbar}>
          <strong>{project?.name ?? copy("未保存项目", "Unsaved project")}</strong>
          <div className={styles.editorTools}>
            <button aria-label={copy("撤销", "Undo")} disabled={!history?.past.length} onClick={() => setHistory((current) => current ? undoStudioHistory(current) : current)} type="button"><Icon name="undo" size={17} />{copy("撤销", "Undo")}</button>
            <button aria-label={copy("重做", "Redo")} disabled={!history?.future.length} onClick={() => setHistory((current) => current ? redoStudioHistory(current) : current)} type="button"><Icon name="redo" size={17} />{copy("重做", "Redo")}</button>
            <button aria-label={copy("保存项目", "Save project")} disabled={!dsl} onClick={saveProject} type="button"><Icon name="save" size={17} />{copy("保存项目", "Save")}</button>
            <button aria-label={copy("复制项目", "Duplicate project")} disabled={!dsl} onClick={copyProject} type="button"><Icon name="copy" size={17} />{copy("复制", "Duplicate")}</button>
            {!english ? <Link href="/projects"><Icon name="project" size={17} />项目</Link> : null}
          </div>
          <div className={styles.zoomTools}>
            <button aria-label={copy("缩小画布", "Zoom out")} disabled={previewZoom <= 80} onClick={() => setPreviewZoom((current) => Math.max(80, current - 20))} type="button"><Icon name="zoom-out" />{copy("缩小", "Out")}</button>
            <span>{previewZoom}%</span>
            <button aria-label={copy("放大画布", "Zoom in")} disabled={previewZoom >= 140} onClick={() => setPreviewZoom((current) => Math.min(140, current + 20))} type="button"><Icon name="zoom-in" />{copy("放大", "In")}</button>
            <button aria-label={copy("导出 SVG", "Export SVG")} onClick={() => void exportSvg()} type="button"><Icon name="download" />{copy("导出", "Export")}</button>
          </div>
        </div>

        <div className={styles.editorGrid}>
          <aside className={`${styles.leftPanel} ${mobileControlsOpen ? styles.mobilePanelOpen : ""}`} aria-label={copy("Studio 参数", "Studio parameters")}>
            <button
              aria-expanded={mobileControlsOpen}
              className={styles.mobilePanelToggle}
              onClick={() => setMobileControlsOpen((current) => !current)}
              type="button"
            >
              <span><Icon name="sliders" />{copy("参数与字形", "Parameters and glyphs")}</span>
              <span>{mobileControlsOpen ? copy("收起", "Collapse") : copy("展开", "Expand")}<Icon className={mobileControlsOpen ? styles.chevronOpen : ""} name="chevron" size={15} /></span>
            </button>
            <div className={styles.leftPanelBody}>
            <div className={styles.mobileProjectActions}>
              <button aria-label={copy("保存项目", "Save project")} disabled={!dsl} onClick={saveProject} type="button"><Icon name="save" />{copy("保存", "Save")}</button>
              <button aria-label={copy("复制项目", "Duplicate project")} disabled={!dsl} onClick={copyProject} type="button"><Icon name="copy" />{copy("复制", "Duplicate")}</button>
              {!english ? <Link href="/projects"><Icon name="project" />项目</Link> : null}
            </div>
            <label className="field-label" htmlFor="studio-text">{copy("文字内容", "Seal inscription")}</label>
            <input className="paper-input" id="studio-text" lang="zh-Hans" value={dsl?.text ?? ""} readOnly />
            <p className={styles.termLine}>{copy("印式：", "Seal type: ")}{english ? <><span>Zhuwen</span><span>/</span><span>Baiwen</span></> : <><TermPopover slug="zhuwen">朱文</TermPopover><span>/</span><TermPopover slug="baiwen">白文</TermPopover></>}</p>
            <div className="segmented-control">
              <button className={dsl?.mode === "yang" ? "segment-button is-selected" : "segment-button"} aria-pressed={dsl?.mode === "yang"} onClick={() => updateDsl((current) => ({ ...current, mode: "yang" }), "style_change")} type="button">{copy("朱文", "Zhuwen")}</button>
              <button className={dsl?.mode === "yin" ? "segment-button is-selected" : "segment-button"} aria-pressed={dsl?.mode === "yin"} onClick={() => updateDsl((current) => ({ ...current, mode: "yin" }), "style_change")} type="button">{copy("白文", "Baiwen")}</button>
            </div>

            <div className={styles.settingGroup}><strong>{copy("布局样式", "Composition (zhangfa)")}</strong><div className={styles.iconOptions}>{layoutOptions[locale].map((option) => <button aria-pressed={dsl?.layout.strategy === option.value} className={dsl?.layout.strategy === option.value ? styles.iconActive : ""} key={option.value} onClick={() => updateDsl((current) => ({ ...current, layout: { ...current.layout, strategy: option.value } }), "style_change")} type="button">{option.label}</button>)}</div></div>
            <div className={styles.settingGroup}><strong>{copy("边框样式", "Border")}</strong><div className={styles.iconOptions}>{borderOptions[locale].map((option) => <button aria-pressed={dsl?.border.type === option.value} className={dsl?.border.type === option.value ? styles.iconActive : ""} key={option.value} onClick={() => updateDsl((current) => ({ ...current, border: { ...current.border, type: option.value } }), "style_change")} type="button">{option.label}</button>)}</div></div>
            <div className={styles.settingGroup}>
              <label className="field-label" htmlFor="studio-shape">{copy("篆书书体", "Seal script")}</label>
              <select className="paper-select" id="studio-shape" value={dsl?.script ?? "han_seal"} onChange={(event) => updateDsl((current) => ({ ...current, script: event.target.value as SealDsl["script"] }), "style_change")}>
                {(Object.keys(scriptLabels) as SealDsl["script"][]).map((script) => <option key={script} value={script}>{english ? englishScriptLabels[script] : scriptLabels[script]}</option>)}
              </select>
            </div>

            <div className={styles.settingGroup}>
              <div className={styles.glyphPickerHeading}><strong>{copy("单字 Variant", "Glyph variant")}</strong><small>{copy("双击印面也可选字", "Double-click the seal to select a character")}</small></div>
              <div className={styles.glyphCharacterTabs} aria-label={copy("选择要编辑的单字", "Select a character to edit")}>
                {dsl?.glyphs.map((glyph, index) => (
                  <button
                    aria-pressed={selectedGlyphIndex === index}
                    className={selectedGlyphIndex === index ? styles.glyphCharacterActive : styles.glyphCharacter}
                    key={`${glyph.char}-${index}`}
                    onClick={() => setSelectedGlyphIndex(index)}
                    type="button"
                  >
                    <span lang="zh-Hans">{glyph.char}</span>{glyph.locked ? <span aria-label={copy("已锁定", "Locked")}><Icon name="lock" size={11} /></span> : null}
                  </button>
                ))}
              </div>
              <div className={styles.glyphVariants} aria-busy={variantStatus === "loading"} aria-label={english ? `Glyph variants for ${selectedCharacter || "the current character"}` : `${selectedCharacter || "当前字"}的字形 Variant`}>
                {glyphVariants.map((variant) => (
                  <button
                    aria-label={english ? `Use ${englishScriptLabels[variant.script]} glyph` : `使用${scriptLabels[variant.script]}字形`}
                    aria-pressed={selectedGlyph?.variantId === variant.id}
                    className={selectedGlyph?.variantId === variant.id ? styles.glyphVariantActive : styles.glyphVariant}
                    key={variant.id}
                    onClick={() => selectGlyphVariant(variant.id)}
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox={variant.viewBox}><path d={variant.svgPath} /></svg>
                    <span>{english ? englishScriptLabels[variant.script] : scriptLabels[variant.script]}</span>
                    {variant.recommended ? <small>{copy("推荐", "Recommended")}</small> : null}
                  </button>
                ))}
              </div>
              {variantStatus === "loading" ? <p className={styles.variantMessage}>{copy("正在载入字形…", "Loading glyphs...")}</p> : null}
              {variantStatus === "empty" ? <p className={styles.variantMessage}>{copy("暂无可替换字形，继续使用引擎降级字形。", "No alternate glyph is available. The engine fallback remains in use.")}</p> : null}
              {variantStatus === "error" ? <p className={styles.variantMessage}>{copy("字形载入失败，不影响当前印面。", "Glyph loading failed. The current seal impression is unaffected.")}</p> : null}
              {glyphVariants.length ? (
                <div className={styles.glyphMeta}>
                  <span lang="zh-Hans">{glyphVariants.find((variant) => variant.id === selectedGlyph?.variantId)?.source ?? glyphVariants[0]?.source}</span>
                  <button aria-pressed={selectedGlyph?.locked ?? false} onClick={toggleGlyphLock} type="button"><Icon name={selectedGlyph?.locked ? "unlock" : "lock"} />{selectedGlyph?.locked ? copy("解除锁定", "Unlock glyph") : copy("锁定字形", "Lock glyph")}</button>
                </div>
              ) : null}
            </div>

            <div className={styles.settingGroup}><strong>{copy("笔画风格调节", "Stroke and impression")}</strong>
              {rangeSettings.map(([label, termSlug, value, setter]) => <div className={styles.range} key={label}><span>{termSlug && !english ? <TermPopover slug={termSlug}>{label}</TermPopover> : label}</span><input aria-label={label} type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => setter(Number(event.target.value))} /><output>{Math.round(value * 100)}%</output></div>)}
            </div>

            <div className={styles.settingGroup}><label className="field-label" htmlFor="studio-seed">{copy("印蜕 seed", "Impression seed")}</label><input className="paper-input technical-value" id="studio-seed" type="number" value={dsl?.impression.seed ?? 0} onChange={(event) => updateDsl((current) => ({ ...current, impression: { ...current.impression, seed: Math.max(0, Number(event.target.value) || 0) } }))} /></div>
            <button className="outline-button" onClick={() => updateDsl((current) => ({ ...current, impression: { ...current.impression, seed: (current.impression.seed + 1) >>> 0 } }), "impression_change")} type="button"><Icon name="stamp" />{copy("重新盖印", "Restamp")}</button>

            <details className={styles.carvingSettings}>
              <summary>{copy("刻制辅助", "Carving aids")}</summary>
              <label className="field-label" htmlFor="studio-size-mm">{copy("印面真实尺寸（mm）", "Physical seal-face size (mm)")}</label>
              <input
                className="paper-input technical-value"
                id="studio-size-mm"
                max="120"
                min="8"
                onChange={(event) => updateDsl((current) => ({
                  ...current,
                  physical: {
                    ...current.physical,
                    sizeMm: Math.max(8, Math.min(120, Number(event.target.value) || 8)),
                  },
                }))}
                type="number"
                value={dsl?.physical.sizeMm ?? 25}
              />
              <div aria-label={copy("常用印面尺寸", "Common seal-face sizes")} className={styles.sizePresets}>
                {[15, 18, 20, 25, 30].map((size) => (
                  <button
                    aria-pressed={dsl?.physical.sizeMm === size}
                    key={size}
                    onClick={() => updateDsl((current) => ({
                      ...current,
                      physical: { ...current.physical, sizeMm: size },
                    }))}
                    type="button"
                  >
                    {formatMillimeters(size, locale)}
                  </button>
                ))}
              </div>
              <button className="outline-button" onClick={() => setStageMode("carving")} type="button">{copy("打开正反稿", "Open normal and mirrored proofs")}</button>
              <small>{copy("M 打开反字稿 · R 切换近似真实大小", "M opens the mirrored proof · R toggles approximate real size")}</small>
            </details>

            {dsl ? (
              <SideInscriptionEditor
                dsl={dsl}
                exporting={exporting !== null}
                locale={locale}
                onChange={(inscription) => updateDsl((current) => ({ ...current, inscription }))}
                onCommit={commitInscription}
                onExport={exportInscriptionRubbing}
              />
            ) : null}

            <div className={styles.exportFormats}><strong>{copy("导出设置", "Export")}</strong><div><button aria-label={copy("导出 PNG", "Export PNG")} disabled={exporting !== null} onClick={() => void exportPng("paper")} type="button">PNG</button><button aria-label={copy("导出透明 PNG", "Export transparent PNG")} disabled={exporting !== null} onClick={() => void exportPng("transparent")} type="button">{copy("透明 PNG", "Transparent PNG")}</button><button disabled={exporting !== null} onClick={() => void exportSvg()} type="button">SVG</button><button disabled={exporting !== null || !dsl} onClick={() => { setStageMode("carving"); setStatusMessage(copy("请在刻制辅助中核对正反稿，再导出 1:1 PDF。", "Verify the normal and mirrored proofs in Carving aids before exporting the 1:1 PDF.")); }} type="button">1:1 PDF</button></div></div>
            <details className={styles.mobileVersionPanel}>
              <summary><Icon name="history" />{copy(`版本历史（${project?.versions.length ?? 0}）`, `Version history (${project?.versions.length ?? 0})`)}</summary>
              {renderVersionHistory()}
            </details>
            </div>
          </aside>

          <section className={styles.stage} aria-label={stageMode === "stone" ? copy("3D 石章查看舞台", "3D seal stone stage") : stageMode === "carving" ? copy("刻制辅助舞台", "Carving aids stage") : copy("印面编辑舞台", "Seal impression editing stage")} aria-busy={status === "loading"}>
            <div aria-label={copy("舞台显示方式", "Stage view")} className={styles.stageMode} role="group">
              <button aria-pressed={stageMode === "impression"} onClick={() => setStageMode("impression")} type="button">{copy("印蜕", "Impression")}</button>
              <button aria-pressed={stageMode === "carving"} onClick={() => setStageMode("carving")} type="button">{copy("刻制辅助", "Carving aids")}</button>
              {viewer3dEnabled ? <button aria-pressed={stageMode === "stone"} onClick={() => setStageMode("stone")} type="button">{copy("3D 石章", "3D stone")}</button> : null}
            </div>
            <div className={stageMode === "impression" && showGrid ? `${styles.canvas} ${styles.canvasGrid}` : stageMode === "carving" ? `${styles.canvas} ${styles.carvingCanvas}` : styles.canvas}>
              {stageMode === "impression" ? (
                <>
                  <button aria-label={copy("顺时针旋转印面", "Rotate seal clockwise")} className={styles.rotate} onClick={() => setPreviewRotation((current) => (current + 90) % 360)} type="button"><Icon name="rotate" size={22} /></button>
                  <span className={`${styles.handle} ${styles.handleTop}`} /><span className={`${styles.handle} ${styles.handleRight}`} /><span className={`${styles.handle} ${styles.handleBottom}`} /><span className={`${styles.handle} ${styles.handleLeft}`} />
                  {svg ? <div className={`studio-preview ${styles.preview} ${styles[`zoom${previewZoom}`]} ${styles[`rotate${previewRotation}`]}`} dangerouslySetInnerHTML={{ __html: svg }} onDoubleClick={selectGlyphFromPreview} title={copy("双击单字选择 Variant", "Double-click a character to select a glyph variant")} /> : <p>{copy("正在准备印面…", "Preparing the seal impression...")}</p>}
                  <div className={styles.stageSignature}><span lang="zh-Hans">方寸之间</span><span lang="zh-Hans">自有天地</span><i lang="zh-Hans">方寸</i></div>
                </>
              ) : stageMode === "carving" ? (
                <div aria-busy={carvingStatus === "loading"} className={styles.carvingAid}>
                  <div className={styles.carvingHeading}>
                    <div><strong>{copy("刻制辅助", "Carving aids")}</strong><span>{formatMillimeters(dsl?.physical.sizeMm ?? 25, locale)} · {copy("纯黑白", "black and white")}</span></div>
                    <button aria-pressed={realSizePreview} onClick={() => setRealSizePreview((current) => !current)} type="button">{copy("近似真实大小", "Approximate real size")}</button>
                  </div>
                  {carvingProof ? (
                    <>
                      <div className={styles.proofPair}>
                        <figure><div className={realSizePreview ? styles.proofRealSize : styles.proofFit} dangerouslySetInnerHTML={{ __html: carvingProof.normalSvg }} /><figcaption>{copy("正稿（钤出效果）", "Normal proof (stamped result)")}</figcaption></figure>
                        <figure><div className={realSizePreview ? styles.proofRealSize : styles.proofFit} dangerouslySetInnerHTML={{ __html: carvingProof.mirroredSvg }} /><figcaption>{copy("反稿（上石用）", "Mirrored proof (for transfer to stone)")}</figcaption></figure>
                      </div>
                      <div className={styles.carvingFacts}>
                        <span>{copy("成品尺寸", "Finished size")} {formatDimensionsMillimeters([carvingProof.dimensions.widthMm, carvingProof.dimensions.heightMm], locale)}</span>
                        <span>PNG {carvingProof.pixelsAt300Dpi.width} × {carvingProof.pixelsAt300Dpi.height}px @ 300 dpi</span>
                        {carvingGuidance ? <span lang={english ? undefined : "zh-Hans"}>{english ? `${carvingGuidance.recommendedSizeMm}mm ${englishMaterialLabels[dsl?.physical.material ?? "other"]}; ${carvingGuidance.requiresSpecialistProcessing ? "use a specialist fabricator with the mirrored proof." : dsl?.mode === "yin" ? "carve the strokes first and verify the mirrored proof." : "carve the ground first and preserve the inscription lines."}` : `${carvingGuidance.stoneSummary} · ${carvingGuidance.carvingTip}`}</span> : null}
                      </div>
                      <p className={styles.realSizeNote}>{copy("屏幕显示为近似尺寸，以打印稿和 10 mm 校验标尺为准。", "On-screen size is approximate. Use the printed proof and 10mm scale for verification.")}</p>
                      <div className={styles.carvingActions}>
                        <button disabled={exporting !== null} onClick={() => void exportCarvingPdf()} type="button">{copy("导出 1:1 PDF", "Export 1:1 PDF")}</button>
                        <button disabled={exporting !== null} onClick={exportCarvingSheetSvg} type="button">{copy("导出 1:1 正反 SVG", "Export normal / mirrored SVG")}</button>
                        <button disabled={exporting !== null} onClick={() => void exportCarvingPng()} type="button">{copy("导出反字 PNG", "Export mirrored PNG")}</button>
                      </div>
                    </>
                  ) : carvingStatus === "error" ? (
                    <p>{copy("刻制辅助稿生成失败，当前印蜕仍可继续编辑。", "Carving proof generation failed. You can continue editing the current impression.")}</p>
                  ) : (
                    <p>{copy("正在生成纯黑白正反稿…", "Generating black-and-white normal and mirrored proofs...")}</p>
                  )}
                </div>
              ) : dsl && svg ? (
                <Seal3dViewer
                  dsl={dsl}
                  locale={locale}
                  onMaterialChange={(material) => {
                    updateDsl((current) => ({
                      ...current,
                      physical: { ...current.physical, material },
                    }), "material_change");
                    setStatusMessage(copy(
                      "3D 材质已更新；印面 SVG、尺寸与导出几何保持不变。",
                      "3D material updated. The seal-face SVG, dimensions, and export geometry are unchanged.",
                    ));
                  }}
                  posterSvg={svg}
                />
              ) : (
                <p>{copy("正在准备 3D 海报…", "Preparing the 3D poster...")}</p>
              )}
            </div>
            <div className={styles.stageHint}>
              {stageMode === "impression" ? (
                <><label><input checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} type="checkbox" />{copy("参考网格", "Reference grid")}</label><span>{copy("提示：拖拽控制点可缩放或旋转，双击印面可编辑文字", "Tip: drag the handles to scale or rotate; double-click the impression to edit glyph selection")}</span></>
              ) : stageMode === "carving" ? (
                <><span>{copy("反稿只由当前权威 SVG 整体镜像，不另算几何", "The mirrored proof is a whole-SVG mirror; no geometry is recalculated")}</span><span>{copy("打印前必须核对标签与 10 mm 标尺", "Verify labels and the 10mm scale before printing")}</span></>
              ) : (
                <><span>{copy("材质只改变 3D 表现，不改变印面 SVG 或导出几何", "Materials only change 3D presentation, not the seal-face SVG or export geometry")}</span><span>{copy("WebGL 不可用时自动保留 SVG 海报", "The SVG poster remains available when WebGL is unavailable")}</span></>
              )}
            </div>
          </section>

          <aside className={styles.rightPanel}>
            <div className={styles.rightHeading}><strong>{copy("样式预设", "Style presets")}</strong><Link href={localizeHref("/create", locale)}>{copy("更多 ›", "More ›")}</Link></div>
            <div className={styles.presetGrid}>{presetLabels.map((label, index) => <button className={index === 0 ? styles.presetActive : styles.preset} key={label} type="button">{svg ? <div className={styles.thumbnailPreview} dangerouslySetInnerHTML={{ __html: svg }} /> : null}<span>{label}</span></button>)}</div>

            <div className={styles.historyHeading}><strong><Icon name="history" />{copy("版本历史", "Version history")}</strong>{!english ? <Link href="/projects">全部项目</Link> : null}</div>
            {renderVersionHistory()}

            <dl className={styles.explain}><div><dt>{copy("印式", "Seal type")}</dt><dd>{explainPresentation?.mode ?? "—"}</dd></div><div><dt>{copy("字形", "Script")}</dt><dd>{explainPresentation?.script ?? "—"}</dd></div><div><dt>{copy("章法", "Composition")}</dt><dd>{explainPresentation?.composition ?? formatLayoutStrategy(explain?.layoutStrategy ?? dsl?.layout.strategy, locale)}</dd></div><div><dt>{copy("编辑历史", "Edit history")}</dt><dd>{history?.past.length ?? 0} / 50</dd></div><div><dt>{copy("项目版本", "Project versions")}</dt><dd>{project?.versions.length ?? 0}</dd></div></dl>
            <p className={styles.knowledgeSummary}>{english ? explainPresentation?.summary : <TermRichText text={`${dsl?.mode === "yin" ? "白文" : "朱文"}印面采用${formatLayoutStrategy(explain?.layoutStrategy ?? dsl?.layout.strategy)}，残损与印泥只影响印蜕，不改变字形来源。`} />}</p>
          </aside>
        </div>
        <footer className={`${styles.editorStatus} ${styles[`status-${status}`]}`} aria-live="polite"><span aria-hidden="true" />{statusMessage}</footer>
      </main>
    </div>
  );
}
