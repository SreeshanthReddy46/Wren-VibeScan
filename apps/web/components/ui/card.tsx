import * as React from "react";
import { cn } from "@/lib/utils";

export type SparkColor = "cyan" | "gold" | "emerald" | "purple" | "rose" | "indigo" | "amber";

const SPARK_GRADIENTS: Record<SparkColor, { grad1: [string, string, string]; grad2: [string, string, string] }> = {
  cyan: {
    grad1: ["#ffffff", "#38bdf8", "#0284c7"],
    grad2: ["#ffffff", "#67e8f9", "#06b6d4"],
  },
  gold: {
    grad1: ["#ffffff", "#fef08a", "#f59e0b"],
    grad2: ["#ffffff", "#fde047", "#d97706"],
  },
  emerald: {
    grad1: ["#ffffff", "#6ee7b7", "#10b981"],
    grad2: ["#ffffff", "#a7f3d0", "#059669"],
  },
  purple: {
    grad1: ["#ffffff", "#e9d5ff", "#a855f7"],
    grad2: ["#ffffff", "#d8b4fe", "#9333ea"],
  },
  rose: {
    grad1: ["#ffffff", "#fecdd3", "#f43f5e"],
    grad2: ["#ffffff", "#fda4af", "#e11d48"],
  },
  indigo: {
    grad1: ["#ffffff", "#c7d2fe", "#6366f1"],
    grad2: ["#ffffff", "#a5b4fc", "#4f46e5"],
  },
  amber: {
    grad1: ["#ffffff", "#fed7aa", "#f97316"],
    grad2: ["#ffffff", "#fdba74", "#ea580c"],
  },
};

export function CornerSparks({ color = "cyan" }: { color?: SparkColor }) {
  const cfg = SPARK_GRADIENTS[color] || SPARK_GRADIENTS.cyan;
  const id1 = `sparkle-grad-1-${color}`;
  const id2 = `sparkle-grad-2-${color}`;

  return (
    <>

      <span className="corner-spark corner-spark-tl" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
            fill={`url(#${id1})`}
          />
        </svg>
      </span>

      <span className="corner-spark corner-spark-tr" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
            fill={`url(#${id2})`}
          />
        </svg>
      </span>

      <span className="corner-spark corner-spark-bl" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
            fill={`url(#${id2})`}
          />
        </svg>
      </span>

      <span className="corner-spark corner-spark-br" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
            fill={`url(#${id1})`}
          />
        </svg>
      </span>

      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <linearGradient id={id1} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cfg.grad1[0]} />
            <stop offset="45%" stopColor={cfg.grad1[1]} />
            <stop offset="100%" stopColor={cfg.grad1[2]} />
          </linearGradient>
          <linearGradient id={id2} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cfg.grad2[0]} />
            <stop offset="50%" stopColor={cfg.grad2[1]} />
            <stop offset="100%" stopColor={cfg.grad2[2]} />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}

export function Card({
  className,
  sparkColor = "cyan",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { sparkColor?: SparkColor }) {
  const glowClass = `sky-glow-${sparkColor}`;

  return (
    <div
      className={cn(
        "sky-glow-card rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md text-zinc-950 shadow-sm transition-all",
        glowClass,
        className
      )}
      {...props}
    >
      <CornerSparks color={sparkColor} />
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight text-zinc-900", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-zinc-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
