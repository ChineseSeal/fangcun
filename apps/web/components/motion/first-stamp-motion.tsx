"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./first-stamp-motion.module.css";

gsap.registerPlugin(useGSAP);

type FirstStampMotionProps = {
  children: ReactNode;
  className?: string;
  playKey: number;
};

export function FirstStampMotion({ children, className, playKey }: FirstStampMotionProps) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = container.current;
      if (!root) return;

      const print = root.querySelector<HTMLElement>("[data-stamp-print]");
      const stampTool = root.querySelector<HTMLElement>("[data-stamp-tool]");
      const ripple = root.querySelector<HTMLElement>("[data-stamp-ripple]");
      if (!print || !stampTool || !ripple) return;

      root.dataset.motionRun = String(playKey);
      root.dataset.motionState = "playing";

      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduced) {
            root.dataset.reducedMotion = "true";
            root.dataset.motionState = "complete";
            gsap.set(print, { autoAlpha: 1, clearProps: "filter,opacity,transform,visibility,willChange" });
            gsap.set([stampTool, ripple], { autoAlpha: 0, clearProps: "transform,willChange" });
            return;
          }

          root.dataset.reducedMotion = "false";
          gsap.set(print, { autoAlpha: 0, filter: "blur(1.5px)", willChange: "opacity,filter" });
          gsap.set(stampTool, { autoAlpha: 1, xPercent: -50, y: -26, scale: 1, willChange: "transform,opacity" });
          gsap.set(ripple, { autoAlpha: 0, scale: 0.96, willChange: "transform,opacity" });

          const timeline = gsap.timeline({
            defaults: { overwrite: "auto" },
            onComplete: () => {
              root.dataset.motionState = "complete";
              gsap.set(print, { clearProps: "filter,opacity,transform,visibility,willChange" });
              gsap.set([stampTool, ripple], { clearProps: "transform,willChange" });
            },
          });

          timeline
            .addLabel("press")
            .to(stampTool, { y: 0, scale: 0.97, duration: 0.1, ease: "power2.inOut" }, "press")
            .to(print, { autoAlpha: 0.6, duration: 0.1, ease: "power2.inOut" }, "press")
            .to(ripple, { autoAlpha: 0.65, scale: 1, duration: 0.1, ease: "power2.out" }, "press")
            .addLabel("hold", "+=0.08")
            .to(print, { autoAlpha: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, "hold")
            .to(stampTool, { autoAlpha: 0, y: -26, scale: 1, duration: 0.22, ease: "power2.out" }, "hold")
            .to(ripple, { autoAlpha: 0, scale: 1.02, duration: 0.18, ease: "power2.out" }, "hold");
        },
      );

      return () => media.revert();
    },
    { dependencies: [playKey], scope: container, revertOnUpdate: true },
  );

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-motion-run={playKey}
      data-motion-state="idle"
      data-reduced-motion="false"
      data-testid="first-stamp-motion"
      ref={container}
    >
      <div className={styles.print} data-stamp-print>{children}</div>
      <div aria-hidden="true" className={styles.paperRipple} data-stamp-ripple />
      <div aria-hidden="true" className={styles.stampTool} data-stamp-tool>方寸</div>
    </div>
  );
}
