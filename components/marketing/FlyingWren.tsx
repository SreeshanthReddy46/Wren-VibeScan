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
  phase: number;
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

  // DOM range fallback
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

// 6 Unique Birds Distributed Across the Entire Screen
const BIRDS_CONFIG = [
  // 0: Main Heading Scout (Stands on topmost last word of active heading)
  { id: 0, size: 52, zone: "heading", speed: 0.14, roamX: 0.5, roamY: 0.35, ampX: 60, ampY: 35 },
  // 1: Far Left Sky Wanderer (Roams across left 10% - 30% of screen)
  { id: 1, size: 48, zone: "left", speed: 0.10, roamX: 0.18, roamY: 0.40, ampX: 90, ampY: 70 },
  // 2: Far Right Sky Cruiser (Roams across right 70% - 90% of screen)
  { id: 2, size: 46, zone: "right", speed: 0.11, roamX: 0.82, roamY: 0.45, ampX: 85, ampY: 75 },
  // 3: High Cloud Soarer (Cruises high in top sky 10% - 25% height)
  { id: 3, size: 42, zone: "top", speed: 0.09, roamX: 0.35, roamY: 0.18, ampX: 140, ampY: 30 },
  // 4: Lower Content Explorer (Roams lower 55% - 75% height)
  { id: 4, size: 44, zone: "bottom", speed: 0.12, roamX: 0.65, roamY: 0.68, ampX: 110, ampY: 55 },
  // 5: Free Center Glider (Circles center 35% - 65% in graceful arcs)
  { id: 5, size: 40, zone: "center", speed: 0.08, roamX: 0.50, roamY: 0.52, ampX: 130, ampY: 80 },
];

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [featherTrail, setFeatherTrail] = React.useState<{ id: number; x: number; y: number }[]>([]);

  // 6 Independent Bird State Tracking
  const birdsRef = React.useRef<BirdState[]>(
    BIRDS_CONFIG.map((cfg, i) => ({
      x: 100 + i * 150,
      y: 120 + i * 80,
      rotation: 0,
      scaleX: i % 2 === 0 ? 1 : -1,
      isFlying: false,
      perched: true,
      phase: i * 1.25,
    }))
  );

  const headingPosRef = React.useRef<{ x: number; y: number }>({ x: 200, y: 140 });
  const currentHeadingRef = React.useRef<HTMLElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const trailCount = React.useRef(0);
  const isActivelyScrolling = React.useRef(false);
  const scrollStopTimer = React.useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = React.useRef(0);
  const timeRef = React.useRef(0);

  // Find primary heading visible in viewport
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

  // Initial placement on mount
  React.useEffect(() => {
    setMounted(true);
    lastScrollY.current = window.scrollY;

    const placeBirds = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      if (heroHeading) {
        const box = getUpperLineLastWordBox(heroHeading);
        headingPosRef.current = { x: box.x, y: box.y };
        currentHeadingRef.current = heroHeading;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        birdsRef.current.forEach((bird, i) => {
          const cfg = BIRDS_CONFIG[i];
          if (i === 0) {
            // Main bird on heading last word
            bird.x = box.x;
            bird.y = box.y;
          } else {
            // Other birds distributed across their wide screen sectors
            bird.x = Math.min(vw - 60, Math.max(20, vw * cfg.roamX + Math.sin(cfg.id) * 40));
            bird.y = Math.max(NAVBAR_SAFE_Y + 10, Math.min(vh - 80, vh * cfg.roamY + Math.cos(cfg.id) * 30));
          }
          bird.rotation = 0;
          bird.isFlying = false;
          bird.perched = true;
        });
      }
    };

    placeBirds();
    const timer = setTimeout(placeBirds, 150);

    return () => clearTimeout(timer);
  }, []);

  // Scroll listener: Entire flock takes flight and roams everywhere
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      lastScrollY.current = currentScrollY;

      isActivelyScrolling.current = true;

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);

      // When scroll stops for 140ms, birds settle into their sector resting spots
      scrollStopTimer.current = setTimeout(() => {
        isActivelyScrolling.current = false;
        const active = findActiveHeading();
        if (active) {
          currentHeadingRef.current = active;
          const box = getUpperLineLastWordBox(active);
          headingPosRef.current = { x: box.x, y: box.y };
        }
      }, 140);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (currentHeadingRef.current) {
        const box = getUpperLineLastWordBox(currentHeadingRef.current);
        headingPosRef.current = { x: box.x, y: box.y };
      }
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [mounted, findActiveHeading]);

  // Main 60fps aerodynamic roaming & flight physics loop
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlockPhysics = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Sync active heading position if scroll has settled
      if (!isActivelyScrolling.current && currentHeadingRef.current) {
        const liveBox = getUpperLineLastWordBox(currentHeadingRef.current);
        headingPosRef.current = { x: liveBox.x, y: liveBox.y };
      }

      const headingPos = headingPosRef.current;

      birdsRef.current.forEach((bird, i) => {
        const cfg = BIRDS_CONFIG[i];
        let targetX = 0;
        let targetY = 0;

        if (i === 0) {
          // Bird 0: Dedicated to active heading upper last word
          if (isActivelyScrolling.current) {
            targetX = headingPos.x + Math.sin(t * 1.5 + bird.phase) * 50;
            targetY = Math.max(NAVBAR_SAFE_Y, vh * 0.35 + Math.cos(t * 1.8 + bird.phase) * 30);
          } else {
            targetX = headingPos.x;
            targetY = headingPos.y;
          }
        } else {
          // Birds 1-5: Roam independently across distinct screen sectors
          const baseX = vw * cfg.roamX;
          const baseY = Math.max(NAVBAR_SAFE_Y + 15, Math.min(vh - 90, vh * cfg.roamY));

          if (isActivelyScrolling.current) {
            // Wide sweeping roaming motion while scrolling
            const sweepX = Math.sin(t * (0.8 + i * 0.15) + bird.phase) * cfg.ampX * 1.3;
            const sweepY = Math.cos(t * (0.9 + i * 0.12) + bird.phase) * cfg.ampY * 1.2;
            targetX = Math.min(vw - 60, Math.max(20, baseX + sweepX));
            targetY = Math.max(NAVBAR_SAFE_Y + 10, Math.min(vh - 80, baseY + sweepY));
          } else {
            // Resting position in each bird's distinct zone
            const restOffsetX = Math.sin(bird.phase) * (cfg.ampX * 0.4);
            const restOffsetY = Math.cos(bird.phase) * (cfg.ampY * 0.3);
            targetX = Math.min(vw - 60, Math.max(20, baseX + restOffsetX));
            targetY = Math.max(NAVBAR_SAFE_Y + 10, Math.min(vh - 80, baseY + restOffsetY));
          }
        }

        const dx = targetX - bird.x;
        const dy = targetY - bird.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isActivelyScrolling.current) {
          // Active free flight across the website
          bird.x += dx * cfg.speed;
          bird.y += dy * cfg.speed;
          bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

          if (Math.abs(dx) > 1.2) {
            bird.scaleX = dx > 0 ? 1 : -1;
          }

          const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.42;
          bird.rotation += (targetAngle - bird.rotation) * 0.14;

          bird.isFlying = true;
          bird.perched = false;

          // Golden glints from roaming birds
          if (Math.random() < 0.08) {
            trailCount.current += 1;
            const newParticle = {
              id: trailCount.current,
              x: bird.x + (Math.random() * 8 - 4),
              y: bird.y + (Math.random() * 8 - 4),
            };
            setFeatherTrail((prev) => [...prev.slice(-8), newParticle]);
          }
        } else {
          // Touchdown & resting in each zone
          const landingSpeed = Math.min(0.16, Math.max(0.08, dist * 0.002));

          if (dist > 2.5) {
            bird.x += dx * landingSpeed;
            bird.y += dy * landingSpeed;
            bird.y = Math.max(NAVBAR_SAFE_Y - 4, bird.y);

            if (Math.abs(dx) > 1) {
              bird.scaleX = dx > 0 ? 1 : -1;
            }

            const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.35;
            bird.rotation += (targetAngle - bird.rotation) * 0.18;
          } else {
            // Stopped flying: stands in place
            bird.x = targetX;
            bird.y = targetY;
            bird.rotation += (0 - bird.rotation) * 0.25;

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
      {/* Golden Feather Breeze Particle Trail */}
      {featherTrail.map((p) => (
        <span
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fde047] animate-feather-fade"
          style={{ left: `${p.x + 20}px`, top: `${p.y + 20}px` }}
        />
      ))}

      {/* 6 Realistic Wren Birds Roaming Freely Across Different Zones of the Website */}
      {BIRDS_CONFIG.map((cfg, i) => (
        <div
          key={cfg.id}
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
            style={{ animationDelay: `${i * -0.7}s` }}
          >
            {/* Flying Pose Layer */}
            <div
              className="bird-flying-layer absolute inset-0 transition-opacity duration-100 opacity-0"
            >
              <Image
                src="/assets/wren-flying.png"
                alt={`Roaming Wren Bird ${i + 1}`}
                fill
                priority
                className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.22)] animate-wren-wing-flutter"
                style={{ animationDelay: `${i * -0.09}s` }}
                sizes={`${cfg.size}px`}
              />
            </div>

            {/* Standing Pose Layer (100% solid opaque) */}
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
