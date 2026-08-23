"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { isEnglish, localizeHref } from "@/lib/i18n";
import { BrandMark } from "./brand-mark";
import { Icon } from "./icons";
import styles from "./design-system.module.css";

const navigation = {
  "zh-Hans": [
    { label: "生成", href: "/create" },
    { label: "项目", href: "/projects" },
    { label: "印库", href: "/seals" },
    { label: "字典", href: "/dictionary" },
    { label: "篆刻", href: "/academy" },
    { label: "印谱", href: "/album" },
    { label: "关于", href: "/#about" },
  ],
  en: [
    { label: "Seal", href: "/" },
    { label: "Create", href: "/create" },
    { label: "Archive", href: "/seals" },
    { label: "Dictionary", href: "/dictionary" },
    { label: "Academy", href: "/academy" },
    { label: "Gallery", href: "/gallery" },
    { label: "Album", href: "/album" },
  ],
} as const satisfies Record<Locale, ReadonlyArray<{ label: string; href: string }>>;

export function SiteHeader({ locale = "zh-Hans" }: { locale?: Locale }) {
  const pathname = usePathname();
  const english = isEnglish(locale);
  const englishRoutes = ["/", "/create", "/studio", "/seals", "/dictionary", "/academy", "/gallery", "/album", "/creators"];
  const switchHref = english
    ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
    : englishRoutes.some((route) => route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`))
      ? `/en${pathname === "/" ? "" : pathname}`
      : "/en";

  return (
    <header className={styles.header}>
      <BrandMark locale={locale} />
      <nav className={styles.nav} aria-label={english ? "Main navigation" : "主导航"}>
        {navigation[locale].map((item) => {
          const href = localizeHref(item.href, locale);
          const active = item.href === "/"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
          <Link
            className={active ? styles.navActive : styles.navLink}
            href={href}
            key={`${locale}-${item.href}`}
          >
            {item.label}
          </Link>
          );
        })}
      </nav>
      <div className={styles.headerActions}>
        <Link
          aria-label={english ? "切换到中文" : "Switch to English"}
          className={styles.languageSwitch}
          href={switchHref}
          hrefLang={english ? "zh-Hans" : "en"}
        >
          {english ? "中文" : "EN"}
        </Link>
        {english ? (
          <Link className={styles.login} href={localizeHref("/create", locale)}>
            <span className={styles.avatar}><Icon name="stamp" size={24} /></span>
            <span className={styles.loginLabel}>Start</span>
          </Link>
        ) : (
          <Link className={styles.login} href="/account">
            <span className={styles.avatar}><Icon name="user" size={24} /></span>
            <span className={styles.loginLabel}>账户</span>
            <span className={styles.loginChevron}><Icon name="chevron" size={15} /></span>
          </Link>
        )}
      </div>
    </header>
  );
}
