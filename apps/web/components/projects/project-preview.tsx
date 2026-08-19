"use client";

import { useEffect, useState } from "react";
import type { SealDsl } from "@fangcun/dsl-schema";
import type { Locale } from "@/lib/i18n";
import styles from "./project-preview.module.css";

const previewCache = new Map<string, string>();
const pendingPreviews = new Map<string, Promise<string>>();

function loadPreview(dsl: SealDsl, locale: Locale, cacheKey: string): Promise<string> {
  const cached = previewCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const pending = pendingPreviews.get(cacheKey);
  if (pending) return pending;
  const request = fetch("/api/seals/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dsl, locale }),
  })
    .then(async (response) => {
      const data = await response.json() as { svg?: string };
      if (!response.ok || !data.svg) throw new Error("preview unavailable");
      previewCache.set(cacheKey, data.svg);
      return data.svg;
    })
    .finally(() => pendingPreviews.delete(cacheKey));
  pendingPreviews.set(cacheKey, request);
  return request;
}

export function ProjectPreview({ className = "", dsl, locale = "zh-Hans" }: { className?: string; dsl: SealDsl; locale?: Locale }) {
  const cacheKey = `${locale}:${JSON.stringify(dsl)}`;
  const [svg, setSvg] = useState(() => previewCache.get(cacheKey) ?? "");

  useEffect(() => {
    let active = true;
    setSvg(previewCache.get(cacheKey) ?? "");
    void loadPreview(dsl, locale, cacheKey)
      .then((nextSvg) => { if (active) setSvg(nextSvg); })
      .catch(() => { if (active) setSvg(""); });
    return () => { active = false; };
  }, [cacheKey, dsl, locale]);

  return (
    <div
      aria-busy={svg.length === 0}
      aria-label={locale === "en" ? `${dsl.text} seal preview` : `${dsl.text}印面预览`}
      className={`${styles.root} ${className}`.trim()}
    >
      {svg
        ? <div className={styles.svg} dangerouslySetInnerHTML={{ __html: svg }} />
        : <span aria-hidden="true" className={styles.loading}><i /><i /><i /></span>}
    </div>
  );
}
