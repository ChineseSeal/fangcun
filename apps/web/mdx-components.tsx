import type { MDXComponents } from "mdx/types";
import { LessonInteractive } from "@/components/academy/lesson-interactive";
import { TermRichText } from "@/components/knowledge/term-popover";

export function useMDXComponents(): MDXComponents {
  return {
    LessonInteractive,
    TermRichText,
  };
}
