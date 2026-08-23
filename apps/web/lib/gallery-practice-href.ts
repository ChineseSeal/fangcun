import type { SealDsl } from "@fangcun/dsl-schema";
import { localizeHref, type Locale } from "./i18n";

export function galleryPracticeHref(dsl: SealDsl, locale: Locale): string {
  const query = new URLSearchParams({
    border: dsl.border.type,
    layout: dsl.layout.strategy,
    mode: dsl.mode,
    script: dsl.script,
    seed: String(dsl.impression.seed),
    shape: dsl.shape.type,
    style: dsl.style,
    text: dsl.text,
  });
  return `${localizeHref("/studio", locale)}?${query}`;
}
