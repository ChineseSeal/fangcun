import type { Metadata } from "next";
import { AlbumPage } from "@/components/experiences/album/album-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({ title: "Album Studio | Fangcun", description: "Arrange saved seal snapshots into a printable album page.", locale: "en", path: "/album" });

export default function Page() { return <AlbumPage locale="en" />; }
