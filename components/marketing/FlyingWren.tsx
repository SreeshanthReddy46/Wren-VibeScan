"use client";

import * as React from "react";
import Image from "next/image";

interface BirdPosition {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
}

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
  const lastScrollY = React.useRef(0);
  const isScrollingTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Mount on client
  React.useEffect(() => {
    setMounted(true);
    lastScrollY.current = window.scrollY;

    // Initial position on the first heading or hero title
    const findInitialTarget = () => {
      const heroTitle = document.querySelector("h1") || document.querySelector("h2");
      if (heroTitle) {
        const rect = heroTitle.getBoundingClientRect();
        targetPos.current = {
          x: Math.max(20, rect.left + rect.width - 40),
          y: Math.max(60, rect.top - 35),
        };
        birdPos.current = { ...targetPos.current, rotation: 0, scaleX: 1 };
        currentHeadingRef.current = heroTitle;
      }
    };

    findInitialTarget();
  }, []);

  // Update target heading based on current scroll position and viewport visibility
  const updateTarget = React.useCallback(() => {
    const headings = Array.from(
      document.querySelectorAll("h1, h2, [data-bird-target]")
    );

    if (!headings.length) return;

    const viewportHeight = window.innerHeight;
    const centerY = viewportHeight * 0.35; // Target upper-middle focus

    let closestHeading: Element | null = null;
    let minDistance = Infinity;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      // Look for headings in viewport or approaching center
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const dist = Math.abs(rect.top - centerY);
        if (dist < minDistance) {
          minDistance = dist;
          closestHeading = heading;
        }
      }
    });

    if (closestHeading) {
      const rect = (closestHeading as HTMLElement).getBoundingClientRect();
      const isWide = rect.width > 200;
      // Perch on the top-right of heading, or top-left
      const destX = isWide ? rect.left + Math.min(rect.width - 20, 360) : rect.left + rect.width + 10;
      const destY = Math.max(50, rect.top - 32);

      targetPos.current = {
        x: Math.min(window.innerWidth - 60, Math.max(20, destX)),
        y: destY,
      };

      if (closestHeading !== currentHeadingRef.current) {
        currentHeadingRef.current = closestHeading;
        setIsFlying(true);
        setPerched(false);
      }
    }
  }, []);

  // Scroll listener
  React.useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      setIsFlying(true);
      setPerched(false);
      updateTarget();

      if (isScrollingTimeout.current) clearTimeout(isScrollingTimeout.current);

      isScrollingTimeout.current = setTimeout(() => {
        // Will check if close enough to perch in loop
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

      // Lerp ease
      const speed = Math.min(0.09, Math.max(0.045, dist * 0.0009));

      if (dist > 3) {
        current.x += dx * speed;
        current.y += dy * speed;

        // Facing direction (scaleX: 1 for right, -1 for left)
        if (Math.abs(dx) > 2) {
          current.scaleX = dx > 0 ? 1 : -1;
        }

        // Aerodynamic bank & tilt angle
        const targetAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI) * 0.45;
        current.rotation += (targetAngle - current.rotation) * 0.12;

        setIsFlying(true);
        setPerched(false);

        // Spawn gentle golden feather glints during flight
        if (dist > 40 && Math.random() < 0.2) {
          trailCount.current += 1;
          const newParticle = {
            id: trailCount.current,
            x: current.x + (Math.random() * 10 - 5),
            y: current.y + (Math.random() * 10 - 5),
          };
          setFeatherTrail((prev) => [...prev.slice(-6), newParticle]);
        }
      } else {
        // Landed at target
        current.rotation += (0 - current.rotation) * 0.15;
        if (isFlying) {
          setIsFlying(false);
          setPerched(true);
        }
      }

      // Direct DOM transform for 60fps performance
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
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {/* Golden Feather Breeze Particle Trail */}
      {featherTrail.map((p) => (
        <span
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fde047] animate-feather-fade"
          style={{ left: `${p.x + 20}px`, top: `${p.y + 20}px` }}
        />
      ))}

      {/* Main Flying / Perched Wren Bird Companion (Pure Bird Only with Zero Background) */}
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

          {/* Perched Pose */}
          <div
            className={`absolute inset-0 transition-opacity duration-150 ${
              perched ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <Image
              src="/assets/wren-perched.png"
              alt="Perched Wren Bird"
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
