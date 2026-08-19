import type { SealDsl } from "@fangcun/dsl-schema";
import type { Seal3dModel } from "@fangcun/seal-3d";
import { formatDimensionsMillimeters, isEnglish, type Locale } from "@/lib/i18n";
import { Seal3dViewer } from "./seal-3d-viewer";
import styles from "./historic-seal-3d-panel.module.css";

type HistoricSeal3dPanelProps = {
  artifactMaterial: string;
  artifactTitle: string;
  dsl: SealDsl;
  knob: string;
  locale?: Locale;
  model: Seal3dModel;
  posterSvg: string;
  slug: string;
};

export function HistoricSeal3dPanel({
  artifactMaterial,
  artifactTitle,
  dsl,
  knob,
  locale = "zh-Hans",
  model,
  posterSvg,
  slug,
}: HistoricSeal3dPanelProps) {
  const english = isEnglish(locale);
  const headingId = `historic-seal-3d-${slug}`;
  const dimensions = formatDimensionsMillimeters([
    model.dimensionsMm.width,
    model.dimensionsMm.depth,
    model.dimensionsMm.height,
  ], locale);

  return (
    <section aria-labelledby={headingId} className={`paper-panel ${styles.panel}`}>
      <header className={styles.header}>
        <div>
          <small>DERIVED 3D · A4</small>
          <h2 id={headingId}>
            {english ? `${artifactTitle} derived 3D study` : `${artifactTitle} 3D 教学模型`}
          </h2>
        </div>
        <p>
          {english
            ? `Catalogue facts used: ${artifactMaterial}, ${knob}, ${dimensions}.`
            : `采用公开著录事实：${artifactMaterial}、${knob}、${dimensions}。`}
        </p>
      </header>
      <p className={styles.notice}>
        {english
          ? "The body and knob are parameterized approximations derived from the teaching Seal DSL. This is not an artifact scan, measured survey, restoration, or authentication model."
          : "章体与印钮为 Seal DSL 派生的参数化近似，不是文物扫描、测绘、复原或鉴定模型。"}
      </p>
      <div className={styles.viewerShell}>
        <Seal3dViewer dsl={dsl} locale={locale} modelOverride={model} posterSvg={posterSvg} />
      </div>
    </section>
  );
}
