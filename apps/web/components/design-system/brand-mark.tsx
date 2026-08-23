import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { isEnglish, localizeHref } from "@/lib/i18n";
import styles from "./design-system.module.css";

export function BrandMark({ locale = "zh-Hans" }: { locale?: Locale }) {
  return (
    <Link
      className={styles.brand}
      href={localizeHref("/", locale)}
      aria-label={isEnglish(locale) ? "Fangcun home" : "方寸首页"}
    >
      <svg className={styles.brandSeal} viewBox="0 0 48 48" aria-hidden="true">
        <rect x="3" y="3" width="42" height="42" rx="3" />
        <path d="M8 9h14v13H8zM26 9h14v13H26zM8 26h14v13H8zM26 26h14v13H26z" />
        <path d="M11 12h8v2h-5v5h5M29 12h8v7h-8v-3h5M11 29h8v7h-8v-3h5M29 29h8v2h-5v5h5" />
      </svg>
      <span className={styles.brandType}>
        <strong>{isEnglish(locale) ? "Fangcun" : "方寸"}</strong>
        <small>{isEnglish(locale) ? "Chinese Seal Studio" : "Fangcun"}</small>
      </span>
    </Link>
  );
}
