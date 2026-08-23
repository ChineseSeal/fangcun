import type { Metadata } from "next";
import { AlbumSharePage } from "@/components/experiences/album/album-share-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "分享印谱 | 方寸", description: "只读、可撤销的印谱固定快照。", locale: "zh-Hans", path: "/album/share" });

type PageProps = { params: Promise<{ token: string }> };

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <AlbumSharePage locale="zh-Hans" token={token} />;
}
