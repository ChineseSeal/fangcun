import { loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { findLesson, type LessonInteractiveVariant } from "@fangcun/knowledge/lessons";
import { renderSeal } from "@fangcun/seal-engine";
import { LessonInteractiveClient, type RenderedLessonVariant } from "./lesson-interactive-client";

async function renderVariant(variant: LessonInteractiveVariant): Promise<RenderedLessonVariant> {
  const catalog = await loadGlyphCatalogForText(variant.dsl.text);
  const rendered = renderSeal(variant.dsl, catalog);
  if (!rendered.ok) {
    throw new Error(`Lesson SVG failed: ${rendered.errors.map((error) => error.code).join(",")}`);
  }
  return {
    id: variant.id,
    labelZh: variant.labelZh,
    descriptionZh: variant.descriptionZh,
    svg: rendered.svg,
  };
}

export async function LessonInteractive({ lessonSlug }: { lessonSlug: string }) {
  const lesson = findLesson(lessonSlug);
  if (!lesson) return null;
  const variants = await Promise.all(lesson.interactive.variants.map(renderVariant));

  return (
    <LessonInteractiveClient
      controlLabelZh={lesson.interactive.controlLabelZh}
      descriptionZh={lesson.interactive.descriptionZh}
      eyebrow={lesson.interactive.eyebrow}
      lessonSlug={lesson.slug}
      titleZh={lesson.interactive.titleZh}
      variants={variants}
    />
  );
}
