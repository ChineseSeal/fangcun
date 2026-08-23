import type { Metadata } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/source-serif-4/wght.css";
import { AchievementProvider } from "@/components/achievements/achievement-provider";

export const metadata: Metadata = {
  title: "Fangcun | Chinese Seal Studio",
  description: "Design, understand, and export a Chinese seal from one authoritative Seal DSL.",
  alternates: {
    canonical: "/en",
    languages: { "zh-Hans": "/", en: "/en" },
  },
};

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body className="locale-en"><AchievementProvider locale="en">{children}</AchievementProvider></body>
    </html>
  );
}
