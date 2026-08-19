import type { Metadata } from "next";
import { AlbumSharePage } from "@/components/experiences/album/album-share-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "Shared album | Fangcun", description: "A read-only, revocable pinned seal-album snapshot.", locale: "en", path: "/album/share" });

type PageProps = { params: Promise<{ token: string }> };

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <AlbumSharePage locale="en" token={token} />;
}
