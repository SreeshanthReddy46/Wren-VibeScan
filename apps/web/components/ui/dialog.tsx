"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogClose({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      onClick={onClose}
      className={cn(
        "absolute top-4 right-4 z-10 rounded-full p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400",
        className
      )}
      aria-label="Close dialog"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
