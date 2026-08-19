import type { Metadata } from "next";
import { CreatePage } from "@/components/experiences/create/create-page";
import { pairedMetadata } from "@/lib/i18n";

export const metadata: Metadata = pairedMetadata({
  title: "生成印章 | 方寸",
  description: "输入印文，选择朱白文、书体与章法，生成可编辑的中国印章方案。",
  locale: "zh-Hans",
  path: "/create",
});

export default function Page() {
  return <CreatePage locale="zh-Hans" />;
}
