"use client";

import { Component, useCallback, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { materials, type SealDsl, type SealMaterial } from "@fangcun/dsl-schema";
import { deriveSeal3dModel, seal3dMaterialCatalog, type Seal3dModel } from "@fangcun/seal-3d";
import { eventNames, trackEvent } from "@/lib/events";
import { formatDimensionsMillimeters, isEnglish, type Locale } from "@/lib/i18n";
import type { Seal3dView } from "./seal-3d-canvas";
import styles from "./seal-3d-viewer.module.css";

const Seal3dCanvas = dynamic(
  () => import("./seal-3d-canvas").then((module) => module.Seal3dCanvas),
  { ssr: false },
);

type ViewerStatus = "poster" | "loading" | "ready" | "fallback";

type Seal3dViewerProps = {
  dsl: SealDsl;
  locale?: Locale;
  modelOverride?: Seal3dModel;
  onMaterialChange?: (material: SealMaterial) => void;
  posterSvg: string;
};

type ViewerErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

function releaseProbeContext(context: WebGLRenderingContext | WebGL2RenderingContext) {
  context.getExtension("WEBGL_lose_context")?.loseContext();
}

export function detectViewerFallback(): string | null {
  if ((navigator as NavigatorWithConnection).connection?.saveData) return "SAVE_DATA_ENABLED";
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!context) return "WEBGL_INIT_FAILED";
  releaseProbeContext(context);
  return null;
}

const viewLabels: Record<Locale, Record<Seal3dView, string>> = {
  "zh-Hans": { face: "印面", side: "侧面", knob: "印钮" },
  en: { face: "Seal face", side: "Side", knob: "Knob" },
};

const materialLabels: Record<Locale, Record<SealDsl["physical"]["material"], string>> = {
  "zh-Hans": {
    qingtian: "青田石",
    shoushan: "寿山石",
    changhua: "昌化石",
    bahrain: "巴林石",
    copper: "铜",
    jade: "玉",
    wood: "木",
    ceramic: "陶",
    other: "素石",
  },
  en: {
    qingtian: "Qingtian stone",
    shoushan: "Shoushan stone",
    changhua: "Changhua stone",
    bahrain: "Balin stone",
    copper: "Copper",
    jade: "Jade",
    wood: "Wood",
    ceramic: "Ceramic",
    other: "Plain stone",
  },
};

const selectableMaterials = materials.filter((material) => material !== "other");

const sideLabels: Record<Locale, Record<SealDsl["inscription"]["side"], string>> = {
  "zh-Hans": { front: "正面", back: "背面", left: "左侧", right: "右侧" },
  en: { front: "front", back: "back", left: "left", right: "right" },
};

export function Seal3dViewer({ dsl, locale = "zh-Hans", modelOverride, onMaterialChange, posterSvg }: Seal3dViewerProps) {
  const english = isEnglish(locale);
  const copy = (chinese: string, englishText: string) => english ? englishText : chinese;
  const [status, setStatus] = useState<ViewerStatus>("poster");
  const [fallbackReason, setFallbackReason] = useState("");
  const [view, setView] = useState<Seal3dView>("knob");
  const [attempt, setAttempt] = useState(0);
  const openedAt = useRef(0);
  const readyTracked = useRef(false);
  const model = useMemo(() => modelOverride ?? deriveSeal3dModel(dsl), [dsl, modelOverride]);
  const materialCodeRef = useRef(model.material.code);
  materialCodeRef.current = model.material.code;
  const inscriptionRendering = model.inscription.rendering;
  const inscriptionSurfaceLabel = inscriptionRendering.surface === "cylindrical"
    ? copy("曲面 UV", "Cylindrical UV")
    : copy("平面贴合", "Planar mapping");
  const inscriptionDepthLabel = model.inscription.knife === "double"
    ? copy("双刀深凹凸", "Deep double-knife relief")
    : copy("单刀浅凹凸", "Shallow single-knife relief");

  const fallback = useCallback((reason: string) => {
    setFallbackReason(reason);
    setStatus("fallback");
    trackEvent(eventNames.viewer3dFallback, {
      reason,
      elapsedMs: Math.round(performance.now() - openedAt.current),
    });
  }, []);

  const ready = useCallback(() => {
    setStatus("ready");
    if (readyTracked.current) return;
    readyTracked.current = true;
    trackEvent(eventNames.viewer3dReady, {
      elapsedMs: Math.round(performance.now() - openedAt.current),
      material: materialCodeRef.current,
    });
  }, []);

  function openViewer() {
    openedAt.current = performance.now();
    readyTracked.current = false;
    trackEvent(eventNames.viewer3dOpened, {
      characterCount: Array.from(dsl.text).length,
      material: model.material.code,
      shape: dsl.shape.type,
    });
    const reason = detectViewerFallback();
    if (reason) {
      fallback(reason);
      return;
    }
    setAttempt((current) => current + 1);
    setFallbackReason("");
    setStatus("loading");
  }

  function closeViewer() {
    setStatus("poster");
    setFallbackReason("");
  }

  function changeView(nextView: Seal3dView) {
    setView(nextView);
    trackEvent(eventNames.viewer3dViewChanged, { view: nextView });
  }

  function changeMaterial(material: SealMaterial) {
    if (material === model.material.code || !onMaterialChange) return;
    trackEvent(eventNames.viewer3dMaterialChanged, {
      from: model.material.code,
      to: material,
    });
    onMaterialChange(material);
  }

  const showCanvas = status === "loading" || status === "ready";
  const showPoster = status !== "ready";

  return (
    <div
      className={styles.viewer}
      data-glyph-relief-depth-scale={model.glyphRelief.depthScale}
      data-glyph-relief-mode={model.glyphRelief.mode}
      data-glyph-relief-signed-depth-scale={model.glyphRelief.signedDepthScale}
      data-glyph-relief-source={model.glyphRelief.source}
      data-inscription-depth-scale={model.inscription.enabled ? inscriptionRendering.depthScale : undefined}
      data-inscription-relief={model.inscription.enabled ? inscriptionRendering.relief : undefined}
      data-inscription-surface={model.inscription.enabled ? inscriptionRendering.surface : undefined}
      data-viewer-status={status}
    >
      <div className={styles.visual}>
        {showPoster ? (
          <div
            aria-label={copy("当前印蜕 SVG 海报", "Current seal impression SVG poster")}
            className={styles.poster}
            dangerouslySetInnerHTML={{ __html: posterSvg }}
            role="img"
          />
        ) : null}
        {showCanvas ? (
          <ViewerErrorBoundary key={attempt} onError={() => fallback("WEBGL_INIT_FAILED")}>
            <div className={styles.canvas} data-testid="seal-3d-canvas-host">
              <Seal3dCanvas
                model={model}
                onFallback={fallback}
                onReady={ready}
                posterSvg={posterSvg}
                view={view}
              />
            </div>
          </ViewerErrorBoundary>
        ) : null}

        <div className={styles.status} aria-live="polite" role="status">
          {status === "poster" ? copy("SVG 海报预览，3D 尚未加载", "SVG poster preview. 3D is not loaded yet.") : null}
          {status === "loading" ? copy("正在载入轻量 3D 石章…", "Loading the lightweight 3D seal stone...") : null}
          {status === "ready" ? copy("3D 石章已可交互", "The 3D seal stone is interactive.") : null}
          {status === "fallback" ? copy(`已使用 SVG 海报降级（${fallbackReason}）`, `Using the SVG poster fallback (${fallbackReason}).`) : null}
        </div>

        <div className={styles.primaryAction}>
          {status === "poster" || status === "fallback" ? (
            <button onClick={openViewer} type="button">
              {status === "fallback" ? copy("重试 3D", "Retry 3D") : copy("打开 3D 石章", "Open 3D seal")}
            </button>
          ) : (
            <button onClick={closeViewer} type="button">{copy("关闭 3D", "Close 3D")}</button>
          )}
        </div>
      </div>

      <div aria-label={copy("3D 标准视角", "Standard 3D views")} className={styles.viewControls} role="group">
        {(Object.keys(viewLabels[locale]) as Seal3dView[]).map((option) => (
          <button
            aria-pressed={view === option}
            disabled={status !== "ready"}
            key={option}
            onClick={() => changeView(option)}
            type="button"
          >
            {viewLabels[locale][option]}
          </button>
        ))}
      </div>

      {onMaterialChange ? (
        <div aria-label={copy("3D 材质", "3D materials")} className={styles.materialControls} role="group">
          {selectableMaterials.map((material) => {
            const option = seal3dMaterialCatalog[material];
            return (
              <button
                aria-pressed={model.material.code === material}
                key={material}
                onClick={() => changeMaterial(material)}
                type="button"
              >
                <span aria-hidden="true" style={{ background: `linear-gradient(135deg, ${option.color}, ${option.secondaryColor})` }} />
                {materialLabels[locale][material]}
              </button>
            );
          })}
        </div>
      ) : null}

      <dl aria-label={copy("3D 石章事实", "3D seal stone facts")} className={styles.facts}>
        <div><dt>{copy("材质", "Material")}</dt><dd>{materialLabels[locale][model.material.code]}</dd></div>
        <div><dt>{copy("尺寸", "Dimensions")}</dt><dd>{formatDimensionsMillimeters([model.dimensionsMm.width, model.dimensionsMm.depth, model.dimensionsMm.height], locale)}</dd></div>
        <div><dt>{copy("印式", "Seal type")}</dt><dd>{dsl.mode === "yin" ? copy("白文", "Baiwen") : copy("朱文", "Zhuwen")}</dd></div>
        <div><dt>{copy("印面轮廓", "Glyph relief")}</dt><dd>{model.glyphRelief.mode === "recessed" ? copy("Glyph 路径凹刻预览", "Glyph path recessed preview") : copy("Glyph 路径凸起预览", "Glyph path raised preview")} · {copy("非扫描 / 非生产几何", "Not a scan or production geometry")}</dd></div>
        <div><dt>{copy("边款", "Side inscription")}</dt><dd>{model.inscription.enabled ? `${model.inscription.faces.map((face) => sideLabels[locale][face.side]).join(copy("、", ", "))} · ${model.inscription.faces.length} ${copy("面", model.inscription.faces.length === 1 ? "face" : "faces")} · ${model.inscription.characterCount} ${copy("字", model.inscription.characterCount === 1 ? "character" : "characters")} · ${inscriptionSurfaceLabel} · ${inscriptionDepthLabel}` : copy("未启用", "Not enabled")}</dd></div>
      </dl>
      <p className={styles.help}>{copy("拖动旋转，滚轮或双指缩放；3D 仅为当前 Seal DSL 的派生视图。", "Drag to rotate and use the wheel or pinch to zoom. 3D is a derived view of the current Seal DSL.")}</p>
    </div>
  );
}
