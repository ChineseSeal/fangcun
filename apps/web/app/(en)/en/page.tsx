import type { Metadata } from "next";
import { HomePage } from "@/components/experiences/home/home-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Fangcun | Chinese Seal Studio",
  description: "Design and understand a Chinese seal from traceable glyphs and deterministic geometry.",
  locale: "en",
  path: "/",
});

export default function Page() {
  return <HomePage locale="en" />;
}
