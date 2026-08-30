"use client";

import * as React from "react";
import Image from "next/image";

interface BirdPosition {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
}

const NAVBAR_SAFE_Y = 82; // Minimum Y boundary so bird never clips behind fixed navbar

// Helper to extract the exact bounding rectangle of the LAST WORD in any heading
function getLastWordBoundingBox(headingEl: HTMLElement): { x: number; y: number } {
  // 1. Check for child word spans (like Hero words, demo words)
  const childSpans = Array.from(
    headingEl.querySelectorAll(".word-reveal-wrapper, .demo-title-word, span")
  ).filter((el) => {
    const text = (el as HTMLElement).innerText || el.textContent || "";
    return text.trim().length > 0;
  });

  if (childSpans.length > 0) {
    const lastSpan = childSpans[childSpans.length - 1] as HTMLElement;
    const r = lastSpan.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      // Claws rest directly on top of the last word's center
      return {
        x: Math.min(window.innerWidth - 56, Math.max(10, r.left + r.width * 0.5 - 26)),
        y: Math.max(NAVBAR_SAFE_Y, r.top - 46),
      };
    }
  }

  // 2. Extract DOM Range on the final text node of the heading
  try {
    const walker = document.createTreeWalker(headingEl, NodeFilter.SHOW_TEXT);
    let lastTextNode: Node | null = null;
    let node: Node | null = null;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim().length > 0) {
        lastTextNode = node;
      }
    }

    if (lastTextNode && lastTextNode.textContent) {
      const text = lastTextNode.textContent;
      const match = text.match(/\S+\s*$/);
      if (match && match.index !== undefined) {
        const startIdx = match.index;
        const endIdx = text.length;
        const range = document.createRange();
        range.setStart(lastTextNode, startIdx);
        range.setEnd(lastTextNode, endIdx);
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
    // Range fallback
  }

  // 3. Fallback: Right edge of heading box
  const fallback = headingEl.getBoundingClientRect();
  return {
    x: Math.min(window.innerWidth - 56, Math.max(10, fallback.right - 46)),
    y: Math.max(NAVBAR_SAFE_Y, fallback.top - 46),
  };
}

export function FlyingWren() {
  const [mounted, setMounted] = React.useState(false);
  const [isFlying, setIsFlying] = React.useState(false);
  const [perched, setPerched] = React.useState(true);
  const [featherTrail, setFeatherTrail] = React.useState<{ id: number; x: number; y: number }[]>([]);

  const birdPos = React.useRef<BirdPosition>({ x: 120, y: 140, rotation: 0, scaleX: 1 });
  const targetPos = React.useRef<{ x: number; y: number }>({ x: 120, y: 140 });
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

  // Mount and set initial perch on the Hero heading's last word
  React.useEffect(() => {
    setMounted(true);
    lastScrollY.current = window.scrollY;

    const placeAtHeroLastWord = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      if (heroHeading) {
        const initialPos = getLastWordBoundingBox(heroHeading);
        targetPos.current = initialPos;
        birdPos.current = { ...initialPos, rotation: 0, scaleX: 1 };
        currentHeadingRef.current = heroHeading;
        setIsFlying(false);
        setPerched(true);
      }
    };

    placeAtHeroLastWord();
    const timer = setTimeout(placeAtHeroLastWord, 150);

    return () => clearTimeout(timer);
  }, []);

  // Scroll listener: Travels during scroll, stops flying on the last word when scroll stops
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      isActivelyScrolling.current = true;
      setIsFlying(true);
      setPerched(false);

      // In flight, guide the bird in the viewport along scroll travel
      const viewportHeight = window.innerHeight;
      const midY = viewportHeight * 0.36;
      targetPos.current = {
        x: Math.min(window.innerWidth - 65, Math.max(25, targetPos.current.x)),
        y: Math.max(NAVBAR_SAFE_Y, midY + (scrollDelta > 0 ? 25 : -25)),
      };

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);

      // When scroll stops for 120ms, lock onto the last word of the visible heading
      scrollStopTimer.current = setTimeout(() => {
        isActivelyScrolling.current = false;
        const active = findActiveHeading();
        if (active) {
          currentHeadingRef.current = active;
          targetPos.current = getLastWordBoundingBox(active);
        }
      }, 120);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (currentHeadingRef.current) {
        targetPos.current = getLastWordBoundingBox(currentHeadingRef.current);
      }
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [mounted, findActiveHeading]);

  // Main 60fps aerodynamic flight & touchdown loop
  React.useEffect(() => {
    if (!mounted) return;

    const updateFlightPhysics = () => {
      const current = birdPos.current;

      // If user is not scrolling, continuously sync target with the heading's real DOM position
      if (!isActivelyScrolling.current && currentHeadingRef.current) {
        const livePos = getLastWordBoundingBox(currentHeadingRef.current);
        targetPos.current = livePos;
      }

      const target = targetPos.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isActivelyScrolling.current) {
        // Flight response while scrolling
        current.x += dx * 0.14;
        current.y += dy * 0.14;
        current.y = Math.max(NAVBAR_SAFE_Y - 6, current.y);

        if (Math.abs(dx) > 1.2) {
          current.scaleX = dx > 0 ? 1 : -1;
        }

        const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.42;
        current.rotation += (targetAngle - current.rotation) * 0.15;

        setIsFlying(true);
        setPerched(false);

        if (Math.random() < 0.25) {
          trailCount.current += 1;
          const newParticle = {
            id: trailCount.current,
            x: current.x + (Math.random() * 8 - 4),
            y: current.y + (Math.random() * 8 - 4),
          };
          setFeatherTrail((prev) => [...prev.slice(-6), newParticle]);
        }
      } else {
        // Landing mode: decelerate towards the exact last word
        const speed = Math.min(0.16, Math.max(0.08, dist * 0.002));

        if (dist > 2.5) {
          current.x += dx * speed;
          current.y += dy * speed;
          current.y = Math.max(NAVBAR_SAFE_Y - 6, current.y);

          if (Math.abs(dx) > 1) {
            current.scaleX = dx > 0 ? 1 : -1;
          }

          const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.35;
          current.rotation += (targetAngle - current.rotation) * 0.18;
        } else {
          // Exact snap to the last word: STOP FLYING completely!
          current.x = target.x;
          current.y = target.y;
          current.rotation += (0 - current.rotation) * 0.25;

          if (isFlying) {
            setIsFlying(false);
            setPerched(true);
          }
        }
      }

      // Direct GPU transform on element
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

      {/* Main Flying / Standing Wren Bird Companion (100% solid opaque, in front of all words) */}
      <div
        id="flying-wren-companion"
        className="absolute top-0 left-0 will-change-transform pointer-events-none"
        style={{
          width: "54px",
          height: "54px",
          transform: `translate3d(${birdPos.current.x}px, ${birdPos.current.y}px, 0)`,
          zIndex: 999999,
        }}
      >
        <div
          className={`relative w-full h-full ${
            isFlying ? "animate-wren-flight-bob" : "animate-wren-perch-breathe"
          }`}
        >
          {/* Flying Pose (Solid opaque body) */}
          <div
            className={`absolute inset-0 transition-opacity duration-100 ${
              isFlying ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <Image
              src="/assets/wren-flying.png"
              alt="Flying Wren Bird"
              fill
              priority
              className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.22)] animate-wren-wing-flutter"
              sizes="54px"
            />
          </div>

          {/* Standing Pose (Solid opaque body, standing in front of words) */}
          <div
            className={`absolute inset-0 transition-opacity duration-100 ${
              perched ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <Image
              src="/assets/wren-perched.png"
              alt="Standing Wren Bird"
              fill
              priority
              className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
              sizes="54px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
