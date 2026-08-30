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
}

const NAVBAR_SAFE_Y = 82; // Safe distance below fixed navbar

// Helper to extract the exact coordinate of the LAST WORD on the UPPER/FIRST LINE of any heading
function getUpperLineLastWordBox(headingEl: HTMLElement): { x: number; y: number; width: number; height: number; left: number; top: number; right: number } {
  // 1. Check for child word spans
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
          width: r.width,
          height: r.height,
          left: r.left,
          top: r.top,
          right: r.right,
        };
      }
    }
  }

  // 2. Extract DOM Range on the first sentence / top text line
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
            width: r.width,
            height: r.height,
            left: r.left,
            top: r.top,
            right: r.right,
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
    width: fallback.width,
    height: fallback.height,
    left: fallback.left,
    top: fallback.top,
    right: fallback.right,
  };
}

// Flock configuration: 5 realistic Wren birds with natural formation offsets
const FLOCK_CONFIG = [
  // 0: Alpha Leader (stands directly on upper-line last word)
  { size: 52, scale: 1.0, flightOffset: { x: 0, y: 0 }, perchOffset: { x: 0, y: 0 }, lag: 0.14 },
  // 1: Left Wing Companion (perches near the first word of the heading)
  { size: 48, scale: 0.92, flightOffset: { x: -65, y: -30 }, perchOffset: { x: -60, y: -4 }, lag: 0.11 },
  // 2: Right Wing Companion (perches to the right of the heading)
  { size: 46, scale: 0.88, flightOffset: { x: 70, y: 25 }, perchOffset: { x: 50, y: 0 }, lag: 0.12 },
  // 3: High Soarer (cruises higher in sky / perches gracefully)
  { size: 42, scale: 0.82, flightOffset: { x: -35, y: -55 }, perchOffset: { x: -30, y: -30 }, lag: 0.09 },
  // 4: Playful Tail Flyer (follows formation)
  { size: 44, scale: 0.85, flightOffset: { x: 40, y: 45 }, perchOffset: { x: 28, y: 20 }, lag: 0.10 },
];

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [featherTrail, setFeatherTrail] = React.useState<{ id: number; x: number; y: number }[]>([]);

  // 5 Birds independent state refs
  const birdsRef = React.useRef<BirdState[]>(
    FLOCK_CONFIG.map((_, i) => ({
      x: 100 + i * 40,
      y: 130 + i * 20,
      rotation: 0,
      scaleX: 1,
      isFlying: false,
      perched: true,
    }))
  );

  const baseTargetPos = React.useRef<{ x: number; y: number }>({ x: 120, y: 140 });
  const currentHeadingRef = React.useRef<HTMLElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const trailCount = React.useRef(0);
  const isActivelyScrolling = React.useRef(false);
  const scrollStopTimer = React.useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = React.useRef(0);

  // Find the primary heading visible in current viewport
  const findActiveHeading = React.useCallback((): HTMLElement | null => {
    const headings = Array.from(
      document.querySelectorAll("h1, h2, [data-bird-target]")
    ) as HTMLElement[];

    if (!headings.length) return null;

    const viewportHeight = window.innerHeight;
    const focusCenterY = viewportHeight * 0.35; // Reading focus

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

  // Mount and set initial perch on the Hero heading
  React.useEffect(() => {
    setMounted(true);
    lastScrollY.current = window.scrollY;

    const placeAtHero = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      if (heroHeading) {
        const box = getUpperLineLastWordBox(heroHeading);
        baseTargetPos.current = { x: box.x, y: box.y };
        currentHeadingRef.current = heroHeading;

        birdsRef.current.forEach((b, i) => {
          const cfg = FLOCK_CONFIG[i];
          b.x = Math.min(window.innerWidth - 56, Math.max(10, box.x + cfg.perchOffset.x));
          b.y = Math.max(NAVBAR_SAFE_Y, box.y + cfg.perchOffset.y);
          b.rotation = 0;
          b.scaleX = 1;
          b.isFlying = false;
          b.perched = true;
        });
      }
    };

    placeAtHero();
    const timer = setTimeout(placeAtHero, 150);

    return () => clearTimeout(timer);
  }, []);

  // Scroll listener: Whole flock flies while scrolling, lands when scrolling stops
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      isActivelyScrolling.current = true;

      // In flight, guide flock through viewport
      const viewportHeight = window.innerHeight;
      const midY = viewportHeight * 0.36;
      baseTargetPos.current = {
        x: Math.min(window.innerWidth - 65, Math.max(25, baseTargetPos.current.x)),
        y: Math.max(NAVBAR_SAFE_Y, midY + (scrollDelta > 0 ? 25 : -25)),
      };

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);

      // When scroll stops for 120ms, lock onto the upper line of the active heading
      scrollStopTimer.current = setTimeout(() => {
        isActivelyScrolling.current = false;
        const active = findActiveHeading();
        if (active) {
          currentHeadingRef.current = active;
          const box = getUpperLineLastWordBox(active);
          baseTargetPos.current = { x: box.x, y: box.y };
        }
      }, 120);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (currentHeadingRef.current) {
        const box = getUpperLineLastWordBox(currentHeadingRef.current);
        baseTargetPos.current = { x: box.x, y: box.y };
      }
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [mounted, findActiveHeading]);

  // Main 60fps aerodynamic flight & touchdown loop for all 5 birds
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlockPhysics = () => {
      // Continuously sync base target with real DOM position when scroll has settled
      if (!isActivelyScrolling.current && currentHeadingRef.current) {
        const liveBox = getUpperLineLastWordBox(currentHeadingRef.current);
        baseTargetPos.current = { x: liveBox.x, y: liveBox.y };
      }

      const base = baseTargetPos.current;

      birdsRef.current.forEach((bird, i) => {
        const cfg = FLOCK_CONFIG[i];
        
        // Target calculation: flight formation vs perch distribution
        const offset = isActivelyScrolling.current ? cfg.flightOffset : cfg.perchOffset;
        const destX = Math.min(window.innerWidth - 56, Math.max(10, base.x + offset.x));
        const destY = Math.max(NAVBAR_SAFE_Y - (isActivelyScrolling.current ? 6 : 0), base.y + offset.y);

        const dx = destX - bird.x;
        const dy = destY - bird.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isActivelyScrolling.current) {
          // Dynamic soaring flight
          bird.x += dx * cfg.lag;
          bird.y += dy * cfg.lag;
          bird.y = Math.max(NAVBAR_SAFE_Y - 6, bird.y);

          if (Math.abs(dx) > 1.2) {
            bird.scaleX = dx > 0 ? 1 : -1;
          }

          const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.42;
          bird.rotation += (targetAngle - bird.rotation) * 0.15;

          bird.isFlying = true;
          bird.perched = false;

          // Alpha bird spawns feather glints
          if (i === 0 && Math.random() < 0.25) {
            trailCount.current += 1;
            const newParticle = {
              id: trailCount.current,
              x: bird.x + (Math.random() * 8 - 4),
              y: bird.y + (Math.random() * 8 - 4),
            };
            setFeatherTrail((prev) => [...prev.slice(-6), newParticle]);
          }
        } else {
          // Landing approach towards words/destinations
          const speed = Math.min(0.16, Math.max(0.08, dist * 0.002)) * (1 - i * 0.05);

          if (dist > 2.5) {
            bird.x += dx * speed;
            bird.y += dy * speed;
            bird.y = Math.max(NAVBAR_SAFE_Y - 6, bird.y);

            if (Math.abs(dx) > 1) {
              bird.scaleX = dx > 0 ? 1 : -1;
            }

            const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.35;
            bird.rotation += (targetAngle - bird.rotation) * 0.18;
          } else {
            // Touchdown: stop flying, stand peacefully
            bird.x = destX;
            bird.y = destY;
            bird.rotation += (0 - bird.rotation) * 0.25;

            if (bird.isFlying) {
              bird.isFlying = false;
              bird.perched = true;
            }
          }
        }

        // Direct DOM transform for 60fps GPU acceleration
        const el = document.getElementById(`flying-wren-bird-${i}`);
        if (el) {
          el.style.transform = `translate3d(${bird.x}px, ${bird.y}px, 0) scaleX(${bird.scaleX}) rotate(${bird.rotation}deg)`;
          
          // Toggle flying / perched visibility classes smoothly
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
      {/* Golden Feather Breeze Particle Trail */}
      {featherTrail.map((p) => (
        <span
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fde047] animate-feather-fade"
          style={{ left: `${p.x + 20}px`, top: `${p.y + 20}px` }}
        />
      ))}

      {/* 5 Realistic Wren Birds Flock */}
      {FLOCK_CONFIG.map((cfg, i) => (
        <div
          key={i}
          id={`flying-wren-bird-${i}`}
          className="absolute top-0 left-0 will-change-transform pointer-events-none"
          style={{
            width: `${cfg.size}px`,
            height: `${cfg.size}px`,
            transform: `translate3d(${birdsRef.current[i].x}px, ${birdsRef.current[i].y}px, 0)`,
            zIndex: 999999 - i,
          }}
        >
          <div
            className={`relative w-full h-full ${
              i % 2 === 0 ? "animate-wren-flight-bob" : "animate-wren-perch-breathe"
            }`}
            style={{ animationDelay: `${i * -0.6}s` }}
          >
            {/* Flying Pose Layer */}
            <div
              className="bird-flying-layer absolute inset-0 transition-opacity duration-100 opacity-0"
            >
              <Image
                src="/assets/wren-flying.png"
                alt={`Flying Wren Bird ${i + 1}`}
                fill
                priority
                className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.22)] animate-wren-wing-flutter"
                style={{ animationDelay: `${i * -0.08}s` }}
                sizes={`${cfg.size}px`}
              />
            </div>

            {/* Standing Pose Layer (100% solid opaque, stands on words) */}
            <div
              className="bird-perched-layer absolute inset-0 transition-opacity duration-100 opacity-100"
            >
              <Image
                src="/assets/wren-perched.png"
                alt={`Standing Wren Bird ${i + 1}`}
                fill
                priority
                className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
                sizes={`${cfg.size}px`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
