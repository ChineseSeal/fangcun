"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACHIEVEMENT_EARNED_EVENT,
  type EarnedAchievement,
} from "@/lib/achievement-store";
import { eventNames, trackEvent } from "@/lib/events";
import type { Locale } from "@/lib/i18n";
const AchievementToast = dynamic(
  () => import("./achievement-toast").then((module) => module.AchievementToast),
  { ssr: false },
);

export function AchievementProvider({
  children,
  locale = "zh-Hans",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const queueRef = useRef<EarnedAchievement[]>([]);
  const [active, setActive] = useState<EarnedAchievement | null>(null);

  useEffect(() => {
    function showNext() {
      setActive((current) => current ?? queueRef.current.shift() ?? null);
    }
    function handleEarned(event: Event) {
      const achievements = (event as CustomEvent<EarnedAchievement[]>).detail;
      if (!Array.isArray(achievements)) return;
      for (const achievement of achievements) {
        queueRef.current.push(achievement);
        trackEvent(eventNames.achievementEarned, {
          achievementCode: achievement.code,
          sourceEvent: achievement.sourceEvent,
        });
      }
      showNext();
    }
    window.addEventListener(ACHIEVEMENT_EARNED_EVENT, handleEarned);
    return () => window.removeEventListener(ACHIEVEMENT_EARNED_EVENT, handleEarned);
  }, []);

  return (
    <>
      {children}
      {active ? (
        <AchievementToast
          achievement={active}
          locale={locale}
          onComplete={() => setActive(queueRef.current.shift() ?? null)}
        />
      ) : null}
    </>
  );
}
