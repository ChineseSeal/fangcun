import type { Metadata } from "next";
import { HomePage } from "@/components/experiences/home/home-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "方寸 Fangcun",
  description: "在方寸之间，生成一枚属于你的中国印章。",
  locale: "zh-Hans",
  path: "/",
});

export default function Page() {
  return <HomePage locale="zh-Hans" />;
}
