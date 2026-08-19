"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function MotionReveal({
  children,
  className,
  ariaLabel,
}: MotionRevealProps) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        container.current,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          clearProps: "opacity,transform,visibility",
        },
      );
    },
    { scope: container },
  );

  return (
    <div
      ref={container}
      className={className}
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
