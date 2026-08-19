import type { Locale } from "@/lib/i18n";
import { isEnglish } from "@/lib/i18n";
import styles from "./design-system.module.css";

export function SiteFooter({ locale = "zh-Hans" }: { locale?: Locale }) {
  const english = isEnglish(locale);
  return (
    <footer className={styles.footer}>
      <span />
      <b>方寸</b>
      <p>{english ? "A WORLD WITHIN AN INCH" : "方 寸 之 间 · 自 有 天 地"}</p>
      <span />
    </footer>
  );
}
