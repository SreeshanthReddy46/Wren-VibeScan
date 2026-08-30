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
  restX: number; // Fixed stationary resting X
  restY: number; // Fixed stationary resting Y
  speed: number;
  size: number;
}

const NAVBAR_SAFE_Y = 82; // Safe distance below fixed navbar

// Helper to extract the exact coordinate of the LAST WORD on the UPPER/FIRST LINE of any heading
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
        return {
          x: Math.min(window.innerWidth - 56, Math.max(10, r.left + r.width * 0.5 - 26)),
          y: Math.max(NAVBAR_SAFE_Y, r.top - 46),
        };
      }
    }
  }

  // Fallback with text nodes / DOM range
  try {
    const walker = document.createTreeWalker(headingEl, NodeFilter.SHOW_TEXT);
    let node: Node | null = null;
    const textNodes: Node[] = [];
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim().length > 0) {
        textNodes.push(node);
      }
    }

    if (textNodes.length > 0) {
      const firstTextNode = textNodes[0];
      const text = firstTextNode.textContent || "";
      const sentenceMatch = text.match(/^[^.!?\n]+[.!?]?/);
      const targetStr = sentenceMatch ? sentenceMatch[0].trim() : text.trim();
      const lastWordMatch = targetStr.match(/\S+$/);

      if (lastWordMatch && lastWordMatch.index !== undefined) {
        const startIdx = lastWordMatch.index;
        const endIdx = startIdx + lastWordMatch[0].length;
        const range = document.createRange();
        range.setStart(firstTextNode, startIdx);
        range.setEnd(firstTextNode, endIdx);
        const r = range.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return {
            x: Math.min(window.innerWidth - 56, Math.max(10, r.left + r.width * 0.5 - 26)),
            y: Math.max(NAVBAR_SAFE_Y, r.top - 46),
          };
        }
      }
    }
  } catch (e) {
    // Fallback
  }

  const fallback = headingEl.getBoundingClientRect();
  return {
    x: Math.min(window.innerWidth - 56, Math.max(10, fallback.right - 46)),
    y: Math.max(NAVBAR_SAFE_Y, fallback.top - 46),
  };
}

// 6 Birds with individual sizes and flight speeds
const INITIAL_BIRDS_CONFIG = [
  { size: 52, speed: 0.14 }, // Bird 0: Heading Scout
  { size: 48, speed: 0.11 }, // Bird 1
  { size: 46, speed: 0.12 }, // Bird 2
  { size: 42, speed: 0.09 }, // Bird 3
  { size: 44, speed: 0.13 }, // Bird 4
  { size: 40, speed: 0.10 }, // Bird 5
];

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [featherTrail, setFeatherTrail] = React.useState<{ id: number; x: number; y: number }[]>([]);

  // 6 Birds independent state tracking (Randomized initial positions)
  const birdsRef = React.useRef<BirdState[]>(
    INITIAL_BIRDS_CONFIG.map((cfg, i) => ({
      x: 100 + i * 140,
      y: 120 + (i % 3) * 90,
      rotation: 0,
      scaleX: i % 2 === 0 ? 1 : -1,
      isFlying: false,
      perched: true,
      restX: 100 + i * 140,
      restY: 120 + (i % 3) * 90,
      speed: cfg.speed,
      size: cfg.size,
    }))
  );

  const activeHeadingPosRef = React.useRef<{ x: number; y: number }>({ x: 200, y: 140 });
  const currentHeadingRef = React.useRef<HTMLElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const trailCount = React.useRef(0);
  const isActivelyScrolling = React.useRef(false);
  const scrollStopTimer = React.useRef<NodeJS.Timeout | null>(null);
  const roamTimeRef = React.useRef(0);

  // Find primary visible heading
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

  // Pick new random resting positions across the entire screen
  const pickRandomRestPositions = React.useCallback((headingBox?: { x: number; y: number }) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    birdsRef.current.forEach((bird, i) => {
      if (i === 0 && headingBox) {
        // Bird 0: Perches on active heading's topmost last word
        bird.restX = headingBox.x;
        bird.restY = headingBox.y;
      } else {
        // Birds 1-5: Randomly distributed across screen width (8% - 92%) and height (15% - 80%)
        const randomX = Math.floor(Math.random() * (vw - 140)) + 40;
        const randomY = Math.floor(Math.random() * (vh - NAVBAR_SAFE_Y - 140)) + NAVBAR_SAFE_Y + 30;
        bird.restX = Math.min(vw - 56, Math.max(15, randomX));
        bird.restY = Math.max(NAVBAR_SAFE_Y + 10, Math.min(vh - 70, randomY));
      }
    });
  }, []);

  // Mount: Place birds at randomized positions, completely still until user scrolls
  React.useEffect(() => {
    setMounted(true);

    const initPositions = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      let box = { x: 200, y: 140 };
      if (heroHeading) {
        box = getUpperLineLastWordBox(heroHeading);
        activeHeadingPosRef.current = box;
        currentHeadingRef.current = heroHeading;
      }

      pickRandomRestPositions(box);

      // Snap birds to their initial random positions, 100% still
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

    return () => clearTimeout(timer);
  }, [pickRandomRestPositions]);

  // Scroll listener: Birds ONLY move and roam when scrolling; motionless when stopped
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      // User is actively scrolling: wake up birds and take flight!
      isActivelyScrolling.current = true;

      birdsRef.current.forEach((bird) => {
        bird.isFlying = true;
        bird.perched = false;
      });

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);

      // When scroll stops for 140ms, assign new random resting positions and land completely!
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
      }, 140);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (currentHeadingRef.current) {
        const box = getUpperLineLastWordBox(currentHeadingRef.current);
        activeHeadingPosRef.current = box;
        birdsRef.current[0].restX = box.x;
        birdsRef.current[0].restY = box.y;
      }
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [mounted, findActiveHeading, pickRandomRestPositions]);

  // Main 60fps flight loop: Only flies while scrolling, stays 100% still when resting
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlockPhysics = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (isActivelyScrolling.current) {
        roamTimeRef.current += 0.03;
      }
      const t = roamTimeRef.current;

      birdsRef.current.forEach((bird, i) => {
        let targetX = bird.restX;
        let targetY = bird.restY;

        if (isActivelyScrolling.current) {
          // Dynamic roaming flight while scrolling
          const roamRadiusX = 80 + (i % 3) * 35;
          const roamRadiusY = 50 + (i % 2) * 30;
          const speedFactor = 0.8 + i * 0.2;

          const flightX = bird.restX + Math.sin(t * speedFactor + i * 1.3) * roamRadiusX;
          const flightY = bird.restY + Math.cos(t * (speedFactor * 1.1) + i * 0.9) * roamRadiusY;

          targetX = Math.min(vw - 56, Math.max(15, flightX));
          targetY = Math.max(NAVBAR_SAFE_Y - 4, Math.min(vh - 70, flightY));

          const dx = targetX - bird.x;
          const dy = targetY - bird.y;

          bird.x += dx * bird.speed;
          bird.y += dy * bird.speed;
          bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

          if (Math.abs(dx) > 1.2) {
            bird.scaleX = dx > 0 ? 1 : -1;
          }

          const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.42;
          bird.rotation += (targetAngle - bird.rotation) * 0.15;

          bird.isFlying = true;
          bird.perched = false;

          // Golden glints from roaming birds
          if (Math.random() < 0.07) {
            trailCount.current += 1;
            const newParticle = {
              id: trailCount.current,
              x: bird.x + (Math.random() * 8 - 4),
              y: bird.y + (Math.random() * 8 - 4),
            };
            setFeatherTrail((prev) => [...prev.slice(-8), newParticle]);
          }
        } else {
          // User is NOT scrolling: Smoothly land at resting spot and stay 100% still!
          const dx = bird.restX - bird.x;
          const dy = bird.restY - bird.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 2.5) {
            const landingSpeed = Math.min(0.18, Math.max(0.08, dist * 0.0025));
            bird.x += dx * landingSpeed;
            bird.y += dy * landingSpeed;
            bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

            if (Math.abs(dx) > 1) {
              bird.scaleX = dx > 0 ? 1 : -1;
            }

            const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.35;
            bird.rotation += (targetAngle - bird.rotation) * 0.2;
          } else {
            // Arrived at resting spot: 100% motionless!
            bird.x = bird.restX;
            bird.y = bird.restY;
            bird.rotation = 0;

            if (bird.isFlying) {
              bird.isFlying = false;
              bird.perched = true;
            }
          }
        }

        // Direct DOM update for 60fps GPU acceleration
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
      className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden"
      style={{ zIndex: 999999 }}
      aria-hidden="true"
    >
      {/* Golden Feather Breeze Particle Trail (Only during flight) */}
      {featherTrail.map((p) => (
        <span
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fde047] animate-feather-fade"
          style={{ left: `${p.x + 20}px`, top: `${p.y + 20}px` }}
        />
      ))}

      {/* 6 Realistic Wren Birds Randomly Aligned and Still Until Scroll */}
      {birdsRef.current.map((bird, i) => (
        <div
          key={i}
          id={`flying-wren-bird-${i}`}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{
            width: `${bird.size}px`,
            height: `${bird.size}px`,
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
            {/* Flying Pose Layer (Active only while scrolling) */}
            <div
              className="bird-flying-layer absolute inset-0 transition-opacity duration-100 opacity-0"
            >
              <Image
                src="/assets/wren-flying.png"
                alt={`Wren Bird ${i + 1}`}
                fill
                priority
                className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.22)] animate-wren-wing-flutter"
                style={{ animationDelay: `${i * -0.09}s` }}
                sizes={`${bird.size}px`}
              />
            </div>

            {/* Standing Pose Layer (100% still until scroll) */}
            <div
              className="bird-perched-layer absolute inset-0 transition-opacity duration-100 opacity-100"
            >
              <Image
                src="/assets/wren-perched.png"
                alt={`Standing Wren Bird ${i + 1}`}
                fill
                priority
                className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
                sizes={`${bird.size}px`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
