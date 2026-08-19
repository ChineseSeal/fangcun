import type { Metadata } from "next";
import { AlbumPage } from "@/components/experiences/album/album-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "印谱排版台 | 方寸", description: "把保存的印章快照排成可打印的印谱页面。", locale: "zh-Hans", path: "/album" });

export default function Page() { return <AlbumPage locale="zh-Hans" />; }
