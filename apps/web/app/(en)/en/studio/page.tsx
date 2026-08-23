import type { Metadata } from "next";
import { StudioPage } from "@/components/experiences/studio/studio-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Seal Studio | Fangcun",
  description: "Edit composition, glyphs, seal impression, physical size, and exports from one Seal DSL.",
  locale: "en",
  path: "/studio",
});

export default function Page() {
  return <StudioPage locale="en" />;
}
