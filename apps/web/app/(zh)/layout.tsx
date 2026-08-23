import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-sc/wght.css";
import "@fontsource-variable/noto-serif-sc/wght.css";
import { AchievementProvider } from "@/components/achievements/achievement-provider";

export const metadata: Metadata = {
  title: "方寸 Fangcun",
  description: "在方寸之间，生成一枚属于你的中国印章。",
  alternates: {
    canonical: "/",
    languages: { "zh-Hans": "/", en: "/en" },
  },
};

export default function ChineseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-Hans">
      <body><AchievementProvider locale="zh-Hans">{children}</AchievementProvider></body>
    </html>
  );
}
