import type { Metadata } from "next";

export const locales = ["zh-Hans", "en"] as const;

export type Locale = (typeof locales)[number];

export function isEnglish(locale: Locale): boolean {
  return locale === "en";
}

export function localizeHref(href: string, locale: Locale): string {
  if (!isEnglish(locale) || href.startsWith("/api/") || href.startsWith("/en")) return href;
  if (href === "/") return "/en";
  if (href.startsWith("/#")) return `/en${href.slice(1)}`;
  return `/en${href}`;
}

export function formatMillimeters(value: number, locale: Locale): string {
  const millimeters = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  if (!isEnglish(locale)) return `${millimeters} mm`;
  const inches = Number((value / 25.4).toFixed(2));
  return `${millimeters}mm (${inches.toFixed(2)}in)`;
}

export function formatDimensionsMillimeters(values: readonly number[], locale: Locale): string {
  const metricValues = values.map((value) => Number(value.toFixed(2)));
  if (!isEnglish(locale)) return `${metricValues.join(" × ")} mm`;
  const metric = metricValues.join(" x ");
  const imperial = values.map((value) => (value / 25.4).toFixed(2)).join(" x ");
  return `${metric} mm (${imperial} in)`;
}

export function formatLocalDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(isEnglish(locale) ? "en-US" : "zh-CN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function pairedMetadata({
  description,
  locale,
  path,
  title,
}: {
  description: string;
  locale: Locale;
  path: string;
  title: string;
}): Metadata {
  const normalizedPath = path === "/" ? "" : path;
  const chinesePath = normalizedPath || "/";
  const englishPath = `/en${normalizedPath}` || "/en";
  return {
    title,
    description,
    alternates: {
      canonical: isEnglish(locale) ? englishPath : chinesePath,
      languages: {
        "zh-Hans": chinesePath,
        en: englishPath,
      },
    },
  };
}
