"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollImageEffectProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scaleRange?: [number, number];
}

export function ScrollImageEffect({
  children,
  className,
  maxTilt = 12,
  scaleRange = [0.92, 1],
}: ScrollImageEffectProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = React.useState({
    rotateX: maxTilt,
    scale: scaleRange[0],
    translateY: 30,
    opacity: 0.85,
  });

  React.useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress through viewport (0: below screen, 1: center of viewport)
      const elementCenter = rect.top + rect.height / 2;
      const viewportProgress = Math.max(
        0,
        Math.min(1, 1 - (elementCenter - windowHeight * 0.45) / (windowHeight * 0.75))
      );

      const rotateX = (1 - viewportProgress) * maxTilt;
      const scale = scaleRange[0] + viewportProgress * (scaleRange[1] - scaleRange[0]);
      const translateY = (1 - viewportProgress) * 28;
      const opacity = 0.8 + viewportProgress * 0.2;

      setTransformStyle({
        rotateX,
        scale,
        translateY,
        opacity,
      });
    };

    const onScroll = () => {
      animationFrameId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [maxTilt, scaleRange]);

  return (
    <div
      ref={ref}
      style={{
        perspective: "1200px",
      }}
      className={cn("w-full", className)}
    >
      <div
        style={{
          transform: `perspective(1200px) rotateX(${transformStyle.rotateX}deg) scale(${transformStyle.scale}) translateY(${transformStyle.translateY}px)`,
          opacity: transformStyle.opacity,
          transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
          transformOrigin: "center top",
        }}
      >
        {children}
      </div>
    </div>
  );
}
