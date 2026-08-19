"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { achievementDefinitions } from "@fangcun/knowledge/achievements";
import { SealImpression } from "@/components/design-system/seal-impression";
import type { EarnedAchievement } from "@/lib/achievement-store";
import type { Locale } from "@/lib/i18n";
import { isEnglish } from "@/lib/i18n";
import styles from "./achievement-provider.module.css";

gsap.registerPlugin(useGSAP);

export function AchievementToast({
  achievement,
  locale,
  onComplete,
}: {
  achievement: EarnedAchievement;
  locale: Locale;
  onComplete: () => void;
}) {
  const toastRef = useRef<HTMLDivElement>(null);
  const definition = achievementDefinitions.find((candidate) => candidate.code === achievement.code);

  useGSAP(() => {
    const toast = toastRef.current;
    if (!toast) return;
    const media = gsap.matchMedia();
    let timer: number | undefined;
    media.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions?.reduced) {
          gsap.set(toast, { autoAlpha: 1, clearProps: "transform" });
        } else {
          gsap.fromTo(
            toast,
            { autoAlpha: 0, scale: 1.08, y: -10 },
            { autoAlpha: 1, duration: 0.3, ease: "back.out(1.7)", scale: 1, y: 0 },
          );
        }
        timer = window.setTimeout(onComplete, 3_400);
      },
    );
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      media.revert();
    };
  }, { dependencies: [achievement.code], scope: toastRef, revertOnUpdate: true });

  if (!definition) return null;
  const english = isEnglish(locale);
  const englishCopy: Record<string, { description: string; name: string }> = {
    chu_ke: { name: "First Cut", description: "Generated your first Chinese seal" },
    shi_zhu_bai: { name: "Read Zhuwen and Baiwen", description: "Scored 4 out of 5 in the introduction quiz" },
    shang_shi: { name: "Ready for Stone", description: "Exported a carving aid" },
  };
  const copy = englishCopy[achievement.code];
  return (
    <div
      aria-atomic="true"
      className={styles.toast}
      data-achievement-code={achievement.code}
      ref={toastRef}
      role="status"
    >
      <div aria-hidden="true" className={styles.seal}>
        <SealImpression mode="solid" text={definition.sealText} />
      </div>
      <div>
        <span>{english ? "SEAL MARK EARNED" : "获得印记"}</span>
        <strong>{english ? copy?.name ?? definition.nameZh : definition.nameZh}</strong>
        <small>{english ? copy?.description ?? definition.descriptionZh : definition.descriptionZh}</small>
      </div>
    </div>
  );
}
