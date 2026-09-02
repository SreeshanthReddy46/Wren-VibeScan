"use client";

import * as React from "react";
import Image from "next/image";

interface BirdState {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  isFlying: boolean;
  perched: boolean;
  restX: number;
  restY: number;
  speed: number;
  size: number;
}

const NAVBAR_SAFE_Y = 75;

// Helper to extract coordinate of the last word on the first line of any heading
function getUpperLineLastWordBox(headingEl: HTMLElement): { x: number; y: number } {
  const childSpans = Array.from(
    headingEl.querySelectorAll(".word-reveal-wrapper, .demo-title-word, span")
  ).filter((el) => {
    const text = (el as HTMLElement).innerText || el.textContent || "";
    return text.trim().length > 0;
  }) as HTMLElement[];

  if (childSpans.length > 0) {
    let minTop = Infinity;
    childSpans.forEach((span) => {
      const rect = span.getBoundingClientRect();
      if (rect.top < minTop) {
        minTop = rect.top;
      }
    });

    const upperLineWords = childSpans.filter((span) => {
      const rect = span.getBoundingClientRect();
      return Math.abs(rect.top - minTop) <= 18;
    });

    const targetWord = upperLineWords[upperLineWords.length - 1];
    if (targetWord) {
      const r = targetWord.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        return {
          x: Math.min(window.innerWidth - (isMobile ? 42 : 56), Math.max(10, r.left + r.width * 0.5 - (isMobile ? 18 : 26))),
          y: Math.max(NAVBAR_SAFE_Y, r.top - (isMobile ? 36 : 44)),
        };
      }
    }
  }

  const fallback = headingEl.getBoundingClientRect();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  return {
    x: Math.min(window.innerWidth - (isMobile ? 42 : 56), Math.max(10, fallback.right - (isMobile ? 36 : 46))),
    y: Math.max(NAVBAR_SAFE_Y, fallback.top - (isMobile ? 36 : 44)),
  };
}

const INITIAL_BIRDS_CONFIG = [
  { size: 50, speed: 0.12 }, // Bird 0: Heading Scout
  { size: 44, speed: 0.10 }, // Bird 1
  { size: 42, speed: 0.11 }, // Bird 2
  { size: 38, speed: 0.09 }, // Bird 3
  { size: 40, speed: 0.11 }, // Bird 4
  { size: 36, speed: 0.09 }, // Bird 5
];

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  const birdsRef = React.useRef<BirdState[]>(
    INITIAL_BIRDS_CONFIG.map((cfg, i) => ({
      x: 100 + i * 120,
      y: 110 + (i % 3) * 70,
      rotation: 0,
      scaleX: i % 2 === 0 ? 1 : -1,
      isFlying: false,
      perched: true,
      restX: 100 + i * 120,
      restY: 110 + (i % 3) * 70,
      speed: cfg.speed,
      size: cfg.size,
    }))
  );

  const activeHeadingPosRef = React.useRef<{ x: number; y: number }>({ x: 200, y: 130 });
  const currentHeadingRef = React.useRef<HTMLElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const isActivelyScrolling = React.useRef(false);
  const scrollStopTimer = React.useRef<NodeJS.Timeout | null>(null);
  const roamTimeRef = React.useRef(0);

  const findActiveHeading = React.useCallback((): HTMLElement | null => {
    const headings = Array.from(
      document.querySelectorAll("h1, h2, [data-bird-target]")
    ) as HTMLElement[];

    if (!headings.length) return null;

    const viewportHeight = window.innerHeight;
    const focusCenterY = viewportHeight * 0.35;

    let bestHeading: HTMLElement | null = null;
    let minDistance = Infinity;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > NAVBAR_SAFE_Y) {
        const dist = Math.abs(rect.top - focusCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          bestHeading = heading;
        }
      }
    });

    return bestHeading;
  }, []);

  const pickRandomRestPositions = React.useCallback((headingBox?: { x: number; y: number }) => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    birdsRef.current.forEach((bird, i) => {
      if (i === 0 && headingBox) {
        bird.restX = headingBox.x;
        bird.restY = headingBox.y;
      } else {
        const randomX = Math.floor(Math.random() * (vw - 120)) + 30;
        const randomY = Math.floor(Math.random() * (vh - NAVBAR_SAFE_Y - 120)) + NAVBAR_SAFE_Y + 20;
        bird.restX = Math.min(vw - 50, Math.max(15, randomX));
        bird.restY = Math.max(NAVBAR_SAFE_Y + 10, Math.min(vh - 65, randomY));
      }
    });
  }, []);

  React.useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    const initPositions = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      let box = { x: 180, y: 130 };
      if (heroHeading) {
        box = getUpperLineLastWordBox(heroHeading);
        activeHeadingPosRef.current = box;
        currentHeadingRef.current = heroHeading;
      }

      pickRandomRestPositions(box);

      birdsRef.current.forEach((bird) => {
        bird.x = bird.restX;
        bird.y = bird.restY;
        bird.rotation = 0;
        bird.isFlying = false;
        bird.perched = true;
      });
    };

    initPositions();
    const timer = setTimeout(initPositions, 150);

    const handleResize = () => {
      checkMobile();
      if (currentHeadingRef.current) {
        const box = getUpperLineLastWordBox(currentHeadingRef.current);
        activeHeadingPosRef.current = box;
        birdsRef.current[0].restX = box.x;
        birdsRef.current[0].restY = box.y;
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [pickRandomRestPositions]);

  // Scroll listener
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      isActivelyScrolling.current = true;

      birdsRef.current.forEach((bird) => {
        bird.isFlying = true;
        bird.perched = false;
      });

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);

      scrollStopTimer.current = setTimeout(() => {
        isActivelyScrolling.current = false;
        const active = findActiveHeading();
        let box: { x: number; y: number } | undefined = undefined;
        if (active) {
          currentHeadingRef.current = active;
          box = getUpperLineLastWordBox(active);
          activeHeadingPosRef.current = box;
        }
        pickRandomRestPositions(box);
      }, 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [mounted, findActiveHeading, pickRandomRestPositions]);

  // 60fps GPU-accelerated Animation Loop (Zero React state updates inside RAF)
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlockPhysics = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobileMode = vw < 768;

      if (isActivelyScrolling.current) {
        roamTimeRef.current += 0.028;
      }
      const t = roamTimeRef.current;

      // On mobile screens, only run physics for Bird 0 (scout); birds 1-5 are hidden
      const birdsToAnimate = mobileMode ? [birdsRef.current[0]] : birdsRef.current;

      birdsToAnimate.forEach((bird, i) => {
        let targetX = bird.restX;
        let targetY = bird.restY;

        if (isActivelyScrolling.current) {
          const roamRadiusX = mobileMode ? 35 : 70 + (i % 3) * 30;
          const roamRadiusY = mobileMode ? 25 : 45 + (i % 2) * 25;
          const speedFactor = 0.8 + i * 0.2;

          const flightX = bird.restX + Math.sin(t * speedFactor + i * 1.3) * roamRadiusX;
          const flightY = bird.restY + Math.cos(t * (speedFactor * 1.1) + i * 0.9) * roamRadiusY;

          targetX = Math.min(vw - (mobileMode ? 42 : 54), Math.max(12, flightX));
          targetY = Math.max(NAVBAR_SAFE_Y - 4, Math.min(vh - 65, flightY));

          const dx = targetX - bird.x;
          const dy = targetY - bird.y;

          bird.x += dx * bird.speed;
          bird.y += dy * bird.speed;
          bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

          if (Math.abs(dx) > 1.2) {
            bird.scaleX = dx > 0 ? 1 : -1;
          }

          const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.35;
          bird.rotation += (targetAngle - bird.rotation) * 0.14;

          bird.isFlying = true;
          bird.perched = false;
        } else {
          const dx = bird.restX - bird.x;
          const dy = bird.restY - bird.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1.6) {
            const landingSpeed = Math.min(0.065, Math.max(0.032, dist * 0.0009));
            bird.x += dx * landingSpeed;
            bird.y += dy * landingSpeed;
            bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

            if (Math.abs(dx) > 0.8) {
              bird.scaleX = dx > 0 ? 1 : -1;
            }

            const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.28;
            bird.rotation += (targetAngle - bird.rotation) * 0.09;
          } else {
            bird.x = bird.restX;
            bird.y = bird.restY;
            bird.rotation += (0 - bird.rotation) * 0.15;

            if (bird.isFlying) {
              bird.isFlying = false;
              bird.perched = true;
            }
          }
        }

        // Direct DOM update (no React re-render overhead)
        const el = document.getElementById(`flying-wren-bird-${i}`);
        if (el) {
          el.style.transform = `translate3d(${bird.x}px, ${bird.y}px, 0) scaleX(${bird.scaleX}) rotate(${bird.rotation}deg)`;

          const flyingLayer = el.querySelector(".bird-flying-layer") as HTMLElement;
          const perchedLayer = el.querySelector(".bird-perched-layer") as HTMLElement;
          if (flyingLayer && perchedLayer) {
            if (bird.isFlying) {
              flyingLayer.style.opacity = "1";
              perchedLayer.style.opacity = "0";
            } else {
              flyingLayer.style.opacity = "0";
              perchedLayer.style.opacity = "1";
            }
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(updateFlockPhysics);
    };

    animFrameRef.current = requestAnimationFrame(updateFlockPhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none"
      style={{ zIndex: 999999 }}
      aria-hidden="true"
    >
      {birdsRef.current.map((bird, i) => {
        // On mobile/phone, only render Bird 0 to avoid clutter and ensure 60fps performance
        const isHiddenOnMobile = isMobile && i > 0;
        const actualSize = isMobile ? Math.min(bird.size, 38) : bird.size;

        return (
          <div
            key={i}
            id={`flying-wren-bird-${i}`}
            className={`absolute top-0 left-0 will-change-transform pointer-events-none ${
              isHiddenOnMobile ? "hidden" : "block"
            }`}
            style={{
              width: `${actualSize}px`,
              height: `${actualSize}px`,
              transform: `translate3d(${bird.x}px, ${bird.y}px, 0)`,
              zIndex: 999999 - i,
            }}
          >
            <div
              className={`relative w-full h-full ${
                i % 2 === 0 ? "animate-wren-flight-bob" : "animate-wren-perch-breathe"
              }`}
              style={{ animationDelay: `${i * -0.7}s` }}
            >
              {/* Flying Pose Layer */}
              <div className="bird-flying-layer absolute inset-0 transition-opacity duration-150 opacity-0">
                <Image
                  src="/assets/wren-flying.png"
                  alt={`Wren Bird ${i + 1}`}
                  fill
                  priority={i === 0}
                  className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.20)] animate-wren-wing-flutter"
                  style={{ animationDelay: `${i * -0.09}s` }}
                  sizes={`${actualSize}px`}
                />
              </div>

              {/* Standing Pose Layer */}
              <div className="bird-perched-layer absolute inset-0 transition-opacity duration-150 opacity-100">
                <Image
                  src="/assets/wren-perched.png"
                  alt={`Standing Wren Bird ${i + 1}`}
                  fill
                  priority={i === 0}
                  className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.22)]"
                  sizes={`${actualSize}px`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
