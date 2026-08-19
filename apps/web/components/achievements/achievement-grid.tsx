import { achievementDefinitions } from "@fangcun/knowledge/achievements";
import { SealImpression } from "@/components/design-system/seal-impression";
import type { AchievementState } from "@/lib/achievement-store";
import styles from "./achievement-grid.module.css";

export function AchievementGrid({ state }: { state: AchievementState }) {
  return (
    <section aria-labelledby="achievement-heading" className={styles.section}>
      <header>
        <div><span>COLLECTED MARKS · K7</span><h2 id="achievement-heading">我的印记</h2></div>
        <p>{Object.keys(state.earned).length} / {achievementDefinitions.length} 枚</p>
      </header>
      <p className={styles.intro}>印记只记录已经完成的创作与学习，不设等级、排行或连续签到。</p>
      <div className={styles.grid}>
        {achievementDefinitions.map((definition) => {
          const earned = state.earned[definition.code];
          return (
            <article
              className={earned ? styles.earned : styles.locked}
              data-achievement-code={definition.code}
              data-earned={String(Boolean(earned))}
              key={definition.code}
            >
              <div aria-hidden="true" className={styles.impression}>
                <SealImpression mode={earned ? "solid" : "outline"} text={definition.sealText} />
              </div>
              <h3>{definition.nameZh}</h3>
              <p>{definition.descriptionZh}</p>
              <small>{earned ? `获得于 ${new Date(earned.earnedAt).toLocaleDateString("zh-CN")}` : "尚未获得"}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
