"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlyphSpecimen } from "@/components/design-system/glyph-specimen";
import { Icon } from "@/components/design-system/icons";
import { SealImpression } from "@/components/design-system/seal-impression";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./seal-making-story.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const storySteps = [
  {
    eyebrow: "取字",
    title: "字形",
    copy: "从可读之字出发，辨明篆体、时代与来源，让每一笔都有出处。",
  },
  {
    eyebrow: "布白",
    title: "章法",
    copy: "依传统阅读顺序安置字形，在方寸内调节疏密、重心与呼吸。",
  },
  {
    eyebrow: "入石",
    title: "刀感",
    copy: "将光洁路径收成有方向的刻痕，保留冲刀、切刀与石性的节奏。",
  },
  {
    eyebrow: "钤印",
    title: "印泥",
    copy: "残损、渗化与边缘浓淡只作用于最终印蜕，原始字形仍可追溯。",
  },
] as const;

type StoryMode = "static" | "static-mobile" | "static-reduced" | "scroll";

type SealMakingStoryProps = {
  previewSvg?: string;
};

export function SealMakingStory({ previewSvg }: SealMakingStoryProps) {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const endAnchor = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const activeStepRef = useRef(0);
  const started = useRef(false);
  const completed = useRef(false);
  const [activeStep, setActiveStep] = useState(0);
  const [mode, setMode] = useState<StoryMode>("static");

  function selectStep(index: number) {
    const trigger = timeline.current?.scrollTrigger;
    if (mode === "scroll" && trigger) {
      const progress = index / (storySteps.length - 1);
      window.scrollTo({
        behavior: "smooth",
        top: trigger.start + (trigger.end - trigger.start) * progress,
      });
      return;
    }

    root.current
      ?.querySelector<HTMLElement>(`[data-story-card="${index}"]`)
      ?.focus({ preventScroll: false });
  }

  function skipStory() {
    trackEvent(eventNames.motionStorySkipped, { storyId: "seal-making" });
    endAnchor.current?.scrollIntoView({
      behavior: mode === "scroll" ? "smooth" : "auto",
      block: "start",
    });
    window.setTimeout(() => endAnchor.current?.focus({ preventScroll: true }), 0);
  }

  function replayStory() {
    started.current = false;
    completed.current = false;
    const trigger = timeline.current?.scrollTrigger;
    if (mode === "scroll" && trigger) {
      window.scrollTo({ behavior: "smooth", top: trigger.start });
      return;
    }
    root.current?.scrollIntoView({ behavior: "auto", block: "start" });
    root.current?.focus({ preventScroll: true });
  }

  useGSAP(
    () => {
      const storyRoot = root.current;
      const storyFrame = frame.current;
      if (!storyRoot || !storyFrame) return;

      const layers = gsap.utils.toArray<HTMLElement>("[data-story-layer]", storyRoot);
      const cards = gsap.utils.toArray<HTMLElement>("[data-story-card]", storyRoot);
      const media = gsap.matchMedia();

      media.add(
        {
          desktop: "(min-width: 821px)",
          mobile: "(max-width: 820px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const conditions = context.conditions as {
            desktop: boolean;
            mobile: boolean;
            reduce: boolean;
          };
          timeline.current = null;
          gsap.set([...layers, ...cards], { clearProps: "all" });

          if (conditions.reduce || !conditions.desktop) {
            const staticMode: StoryMode = conditions.reduce
              ? "static-reduced"
              : "static-mobile";
            setMode(staticMode);
            setActiveStep(3);
            activeStepRef.current = 3;
            return;
          }

          setMode("scroll");
          setActiveStep(0);
          activeStepRef.current = 0;
          gsap.set(layers, { autoAlpha: 0, y: 18 });
          gsap.set(layers[0], { autoAlpha: 1, y: 0 });

          const storyTimeline = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              end: () => `+=${Math.round(window.innerHeight * 0.8)}`,
              invalidateOnRefresh: true,
              onEnter: () => {
                if (started.current) return;
                started.current = true;
                trackEvent(eventNames.motionStoryStarted, { storyId: "seal-making" });
              },
              onUpdate: (self) => {
                const nextStep = self.progress < 0.165
                  ? 0
                  : self.progress < 0.495
                    ? 1
                    : self.progress < 0.83
                      ? 2
                      : 3;
                storyRoot.style.setProperty("--story-progress", `${self.progress}`);
                if (nextStep !== activeStepRef.current) {
                  activeStepRef.current = nextStep;
                  setActiveStep(nextStep);
                }
                if (self.progress >= 0.995 && !completed.current) {
                  completed.current = true;
                  trackEvent(eventNames.motionStoryCompleted, { storyId: "seal-making" });
                }
              },
              pin: storyFrame,
              pinSpacing: true,
              scrub: 0.35,
              start: "top 72px",
              trigger: storyRoot,
            },
          });

          [0.28, 0.58, 0.88].forEach((position, index) => {
            storyTimeline
              .to(layers[index], { autoAlpha: 0, duration: 0.1, y: -12 }, position)
              .fromTo(
                layers[index + 1],
                { autoAlpha: 0, y: 18 },
                { autoAlpha: 1, duration: 0.12, y: 0 },
                position + 0.06,
              );
          });
          storyTimeline.to({}, { duration: 0.01 }, 1);
          timeline.current = storyTimeline;

          let disposed = false;
          document.fonts?.ready.then(() => {
            if (!disposed) ScrollTrigger.refresh();
          });

          return () => {
            disposed = true;
            timeline.current = null;
          };
        },
      );

      return () => {
        storyRoot.style.removeProperty("--story-progress");
        media.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      aria-labelledby="seal-story-title"
      className={styles.story}
      data-story-active-step={activeStep}
      data-story-mode={mode}
      data-testid="seal-making-story"
      ref={root}
      tabIndex={-1}
    >
      <div className={styles.frame} ref={frame}>
        <header className={styles.heading}>
          <div>
            <span>一枚印如何诞生</span>
            <h2 id="seal-story-title">从一字，到一方可钤的印</h2>
            <p>沿着四道工序，看字形如何在方寸之间成为印蜕。</p>
          </div>
          <button className={styles.textButton} onClick={skipStory} type="button">
            跳过演示 <Icon name="arrow" size={16} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.stage} aria-hidden="true">
            <div className={styles.stagePaper}>
              <div className={`${styles.visualLayer} ${styles.glyphLayer}`} data-story-layer>
                <span className={styles.stageLabel}>字形 · 取其篆意</span>
                <GlyphSpecimen character="印" script="xiaozhuan" />
              </div>
              <div className={`${styles.visualLayer} ${styles.layoutLayer}`} data-story-layer>
                <span className={styles.stageLabel}>章法 · 经营方寸</span>
                <div className={styles.layoutGrid}>
                  <GlyphSpecimen character="方" />
                  <GlyphSpecimen character="寸" />
                </div>
              </div>
              <div className={`${styles.visualLayer} ${styles.carvingLayer}`} data-story-layer>
                <span className={styles.stageLabel}>刀感 · 金石入纸</span>
                <SealImpression mode="outline" text="方寸" />
                <i /><i /><i />
              </div>
              <div className={`${styles.visualLayer} ${styles.inkLayer}`} data-story-layer>
                <span className={styles.stageLabel}>印泥 · 钤落成章</span>
                {previewSvg ? (
                  <div
                    className={styles.enginePreview}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  <SealImpression mode="solid" text="方寸" />
                )}
              </div>
            </div>
            <p className={styles.stageNote}>SVG 印蜕始终是权威结果；动效只负责讲述，不改写印章数据。</p>
          </div>

          <div className={styles.steps} aria-label="制印步骤">
            <div className={styles.progressTrack} aria-hidden="true"><i /></div>
            {storySteps.map((step, index) => (
              <button
                aria-current={index === activeStep ? "step" : undefined}
                className={styles.step}
                data-story-card={index}
                key={step.title}
                onClick={() => selectStep(index)}
                type="button"
              >
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stepCopy}>
                  <i>{step.eyebrow}</i>
                  <strong>{step.title}</strong>
                  <small>{step.copy}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.endAnchor} ref={endAnchor} tabIndex={-1}>
        <span>四序已成，继续探索方寸。</span>
        <button className={styles.textButton} onClick={replayStory} type="button">
          <Icon name="refresh" size={16} /> 回看演示
        </button>
      </div>
    </section>
  );
}
