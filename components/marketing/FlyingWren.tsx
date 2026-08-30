"use client";

import * as React from "react";
import Image from "next/image";

interface BirdPosition {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
}

const NAVBAR_SAFE_Y = 82; // Safe distance below fixed navbar

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [isFlying, setIsFlying] = React.useState(false);
  const [perched, setPerched] = React.useState(true);
  const [featherTrail, setFeatherTrail] = React.useState<{ id: number; x: number; y: number }[]>([]);

  const birdPos = React.useRef<BirdPosition>({ x: 120, y: 140, rotation: 0, scaleX: 1 });
  const targetPos = React.useRef<{ x: number; y: number }>({ x: 120, y: 140 });
  const currentHeadingRef = React.useRef<Element | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const trailCount = React.useRef(0);
  const isScrollingTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Calculates exact coordinates to stand on the last word of any heading
  const getLastWordPerchPos = React.useCallback((el: Element) => {
    // 1. Try finding word wrapper elements (e.g. Hero words, demo words)
    const wordSpans = Array.from(
      el.querySelectorAll(".word-reveal-wrapper, .demo-title-word, span")
    ).filter((s) => (s as HTMLElement).innerText && (s as HTMLElement).innerText.trim().length > 0);

    if (wordSpans.length > 0) {
      const lastSpan = wordSpans[wordSpans.length - 1] as HTMLElement;
      const rect = lastSpan.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.min(window.innerWidth - 56, Math.max(10, rect.left + rect.width * 0.4 - 24)),
          y: Math.max(NAVBAR_SAFE_Y, rect.top - 46),
        };
      }
    }

    // 2. Try DOM Range on the final text node of the heading
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let lastTextNode: Node | null = null;
      let node: Node | null = null;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.trim().length > 0) {
          lastTextNode = node;
        }
      }

      if (lastTextNode && lastTextNode.textContent) {
        const textLen = lastTextNode.textContent.length;
        const range = document.createRange();
        range.setStart(lastTextNode, Math.max(0, textLen - 4));
        range.setEnd(lastTextNode, textLen);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: Math.min(window.innerWidth - 56, Math.max(10, rect.left + rect.width * 0.5 - 24)),
            y: Math.max(NAVBAR_SAFE_Y, rect.top - 46),
          };
        }
      }
    } catch (e) {
      // Fallback below
    }

    // 3. Fallback: Rightmost boundary of heading bounding rect
    const fallbackRect = (el as HTMLElement).getBoundingClientRect();
    return {
      x: Math.min(window.innerWidth - 56, Math.max(10, fallbackRect.right - 46)),
      y: Math.max(NAVBAR_SAFE_Y, fallbackRect.top - 46),
    };
  }, []);

  // Mount and set initial perch on the Hero heading's last word
  React.useEffect(() => {
    setMounted(true);

    const placeAtHeroLastWord = () => {
      const heroHeading =
        document.getElementById("hero-heading") ||
        document.querySelector("[data-bird-target='hero-heading']") ||
        document.querySelector("h1");

      if (heroHeading) {
        const initialPos = getLastWordPerchPos(heroHeading);
        targetPos.current = initialPos;
        birdPos.current = { ...initialPos, rotation: 0, scaleX: 1 };
        currentHeadingRef.current = heroHeading;
        setIsFlying(false);
        setPerched(true);
      }
    };

    placeAtHeroLastWord();
    const timer = setTimeout(placeAtHeroLastWord, 180);

    return () => clearTimeout(timer);
  }, [getLastWordPerchPos]);

  // Update target heading based on current scroll position
  const updateTarget = React.useCallback(() => {
    const headings = Array.from(
      document.querySelectorAll("h1, h2, [data-bird-target]")
    );

    if (!headings.length) return;

    const viewportHeight = window.innerHeight;
    const focusY = viewportHeight * 0.35; // Upper-middle reading focus

    let closestHeading: Element | null = null;
    let minDistance = Infinity;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > NAVBAR_SAFE_Y) {
        const dist = Math.abs(rect.top - focusY);
        if (dist < minDistance) {
          minDistance = dist;
          closestHeading = heading;
        }
      }
    });

    if (closestHeading) {
      const newPos = getLastWordPerchPos(closestHeading);
      targetPos.current = newPos;

      if (closestHeading !== currentHeadingRef.current) {
        currentHeadingRef.current = closestHeading;
        setIsFlying(true);
        setPerched(false);
      }
    }
  }, [getLastWordPerchPos]);

  // Scroll & resize listeners
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      setIsFlying(true);
      setPerched(false);
      updateTarget();

      if (isScrollingTimeout.current) clearTimeout(isScrollingTimeout.current);

      isScrollingTimeout.current = setTimeout(() => {
        // Flight physics loop will handle touchdown
      }, 400);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateTarget);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateTarget);
      if (isScrollingTimeout.current) clearTimeout(isScrollingTimeout.current);
    };
  }, [mounted, updateTarget]);

  // Main 60fps aerodynamic flight loop
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlightPhysics = () => {
      const current = birdPos.current;
      const target = targetPos.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Adaptive speed: fast swoops for long distances, gentle deceleration near words
      const speed = Math.min(0.098, Math.max(0.052, dist * 0.0011));

      if (dist > 3) {
        current.x += dx * speed;
        current.y += dy * speed;

        // Enforce safe upper navbar boundary
        current.y = Math.max(NAVBAR_SAFE_Y - 8, current.y);

        // Facing direction based on horizontal travel
        if (Math.abs(dx) > 1.2) {
          current.scaleX = dx > 0 ? 1 : -1;
        }

        // Aerodynamic bank & tilt angle
        const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.38;
        current.rotation += (targetAngle - current.rotation) * 0.12;

        setIsFlying(true);
        setPerched(false);

        // Golden feather dust trail during flight
        if (dist > 30 && Math.random() < 0.22) {
          trailCount.current += 1;
          const newParticle = {
            id: trailCount.current,
            x: current.x + (Math.random() * 8 - 4),
            y: current.y + (Math.random() * 8 - 4),
          };
          setFeatherTrail((prev) => [...prev.slice(-6), newParticle]);
        }
      } else {
        // Touchdown on the last word's letters!
        current.rotation += (0 - current.rotation) * 0.16;
        if (isFlying) {
          setIsFlying(false);
          setPerched(true);
        }
      }

      // Direct DOM transform for 60fps hardware acceleration
      const birdEl = document.getElementById("flying-wren-companion");
      if (birdEl) {
        birdEl.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.scaleX}) rotate(${current.rotation}deg)`;
      }

      animFrameRef.current = requestAnimationFrame(updateFlightPhysics);
    };

    animFrameRef.current = requestAnimationFrame(updateFlightPhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mounted, isFlying]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {/* Golden Feather Breeze Particle Trail */}
      {featherTrail.map((p) => (
        <span
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fde047] animate-feather-fade"
          style={{ left: `${p.x + 20}px`, top: `${p.y + 20}px` }}
        />
      ))}

      {/* Main Flying / Standing Wren Bird Companion */}
      <div
        id="flying-wren-companion"
        className="absolute top-0 left-0 will-change-transform pointer-events-none"
        style={{
          width: "52px",
          height: "52px",
          transform: `translate3d(${birdPos.current.x}px, ${birdPos.current.y}px, 0)`,
        }}
      >
        <div
          className={`relative w-full h-full ${
            isFlying ? "animate-wren-flight-bob" : "animate-wren-perch-breathe"
          }`}
        >
          {/* Flying Pose */}
          <div
            className={`absolute inset-0 transition-opacity duration-150 ${
              isFlying ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <Image
              src="/assets/wren-flying.png"
              alt="Flying Wren Bird"
              fill
              priority
              className="object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] animate-wren-wing-flutter"
              sizes="52px"
            />
          </div>

          {/* Standing Pose (Feet standing directly on the letters with NO branch/stem) */}
          <div
            className={`absolute inset-0 transition-opacity duration-150 ${
              perched ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <Image
              src="/assets/wren-perched.png"
              alt="Standing Wren Bird"
              fill
              priority
              className="object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
              sizes="52px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
