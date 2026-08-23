import type { HistoricSealEntry } from "@fangcun/knowledge/historic-seals";
import type { SealDsl } from "@fangcun/dsl-schema";
import { deriveSeal3dModel, type Seal3dModel } from "@fangcun/seal-3d";

export function deriveHistoricSeal3dModel(entry: HistoricSealEntry, dsl: SealDsl): Seal3dModel {
  return deriveSeal3dModel(dsl, {
    dimensionsMm: entry.model3d.dimensionsMm,
    fitToView: true,
    knobVariant: entry.model3d.knobVariant,
    warnings: ["HISTORIC_MODEL_APPROXIMATED", "HISTORIC_KNOB_APPROXIMATED"],
  });
}

export function historicSealStudioHref(entry: HistoricSealEntry): string {
  const params = new URLSearchParams({
    text: entry.practiceText,
    style: entry.dsl.style,
    mode: entry.dsl.mode,
    script: entry.dsl.script,
    shape: entry.dsl.shape.type,
    layout: entry.dsl.layout.strategy,
    density: String(entry.dsl.layout.density),
    readingOrder: entry.dsl.layout.readingOrder,
    border: entry.dsl.border.type,
    borderWidth: String(entry.dsl.border.width),
    distress: String(entry.dsl.impression.distress),
    inkUneven: String(entry.dsl.impression.inkUneven),
    seed: String(entry.dsl.impression.seed),
    sourceSealId: entry.slug,
    candidate: "0",
  });
  return `/studio?${params.toString()}`;
}
