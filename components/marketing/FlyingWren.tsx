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

// Helper to extract the exact coordinate of the LAST WORD on the UPPER/FIRST LINE of any heading
function getUpperLineLastWordBox(headingEl: HTMLElement): { x: number; y: number } {
  // 1. Check for child word spans (like in Hero words, demo words, etc.)
  const childSpans = Array.from(
    headingEl.querySelectorAll(".word-reveal-wrapper, .demo-title-word, span")
  ).filter((el) => {
    const text = (el as HTMLElement).innerText || el.textContent || "";
    return text.trim().length > 0;
  }) as HTMLElement[];

  if (childSpans.length > 0) {
    // Find the topmost line (minimum top coordinate among words)
    let minTop = Infinity;
    childSpans.forEach((span) => {
      const rect = span.getBoundingClientRect();
      if (rect.top < minTop) {
        minTop = rect.top;
      }
    });

    // Collect all words belonging to this topmost line (within 18px threshold)
    const upperLineWords = childSpans.filter((span) => {
      const rect = span.getBoundingClientRect();
      return Math.abs(rect.top - minTop) <= 18;
    });

    // The target is the LAST word on this upper line / first sentence!
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
      
      // Match first sentence or first phrase
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

  // 3. Fallback: Upper right of heading bounding box
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

  // Find primary heading visible in current viewport
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

  // Mount and set initial perch on the Hero heading's upper-line last word
  React.useEffect(() => {
    setMounted(true);
    lastScrollY.current = window.scrollY;

    const placeAtHeroUpperWord = () => {
      const heroHeading =
        (document.getElementById("hero-heading") as HTMLElement) ||
        (document.querySelector("[data-bird-target='hero-heading']") as HTMLElement) ||
        (document.querySelector("h1") as HTMLElement);

      if (heroHeading) {
        const initialPos = getUpperLineLastWordBox(heroHeading);
        targetPos.current = initialPos;
        birdPos.current = { ...initialPos, rotation: 0, scaleX: 1 };
        currentHeadingRef.current = heroHeading;
        setIsFlying(false);
        setPerched(true);
      }
    };

    placeAtHeroUpperWord();
    const timer = setTimeout(placeAtHeroUpperWord, 150);

    return () => clearTimeout(timer);
  }, []);

  // Scroll listener: Travels during scroll, lands on upper line last word when scroll stops
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

      // When scroll stops for 120ms, lock onto the upper-line last word of the visible heading
      scrollStopTimer.current = setTimeout(() => {
        isActivelyScrolling.current = false;
        const active = findActiveHeading();
        if (active) {
          currentHeadingRef.current = active;
          targetPos.current = getUpperLineLastWordBox(active);
        }
      }, 120);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      if (currentHeadingRef.current) {
        targetPos.current = getUpperLineLastWordBox(currentHeadingRef.current);
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
        const livePos = getUpperLineLastWordBox(currentHeadingRef.current);
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
        // Landing mode: decelerate towards the exact upper word
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
          // Exact snap to the upper-line word: STOP FLYING completely!
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

      {/* Main Flying / Standing Wren Bird Companion */}
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
          {/* Flying Pose */}
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

          {/* Standing Pose (Standing directly on the top-line word letters) */}
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
