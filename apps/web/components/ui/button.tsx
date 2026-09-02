"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "small" | "large";
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "btn-water-wave inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-zinc-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl select-none cursor-pointer";

  const sizeStyles = {
    small: "h-9 px-3.5 text-xs",
    default: "h-11 px-5 text-sm",
    large: "h-13 px-8 text-base",
  };

  const variantStyles = {
    primary: "bg-zinc-950 text-white shadow-sm hover:shadow-md border border-zinc-800/80",
    secondary: "bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800",
    outline: "border border-zinc-300 text-zinc-800 hover:text-white bg-white",
    ghost: "text-zinc-600 hover:text-white bg-transparent",
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      <span className="wave-layer-back" />
      <span className="wave-layer-front" />
      <span className="wave-text">{children}</span>
    </button>
  );
}
