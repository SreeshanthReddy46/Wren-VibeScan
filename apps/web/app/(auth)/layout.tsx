import * as React from "react";
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent">

      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-full overflow-hidden border border-zinc-200/90 bg-white shadow-xs shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/bird-logo.png"
              alt="Wren Logo"
              fill
              className="object-cover scale-110"
              sizes="36px"
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-zinc-950">Wren</span>
        </Link>
      </div>

      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/85 border border-sky-200/80 shadow-xl backdrop-blur-md">
        {children}
      </div>

      <div className="mt-8 text-xs text-sky-900 font-medium">
        © 2026 Wren. Secure static vulnerability analysis.
      </div>
    </div>
  );
}
