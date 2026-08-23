import type { Metadata } from "next";
import { StudioPage } from "@/components/experiences/studio/studio-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "专业编辑器 | 方寸",
  description: "编辑印式、章法、字形、印蜕与刻制尺寸，并导出权威 SVG、PNG 与 PDF。",
  locale: "zh-Hans",
  path: "/studio",
});

export default function Page() {
  return <StudioPage locale="zh-Hans" />;
}
