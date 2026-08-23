import type { Metadata } from "next";
import { CreatePage } from "@/components/experiences/create/create-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "Create a Chinese Seal | Fangcun",
  description: "Enter an inscription, choose Zhuwen or Baiwen, and generate editable seal candidates.",
  locale: "en",
  path: "/create",
});

export default function Page() {
  return <CreatePage locale="en" />;
}
