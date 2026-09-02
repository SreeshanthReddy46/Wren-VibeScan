"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ShieldAlert, Settings, BookOpen, LogOut } from "lucide-react";

export function DashboardSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Scan Reports", href: "/scans/scan-9021", icon: ShieldAlert },
    { label: "Project Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-sky-200/70 bg-white/65 backdrop-blur-md p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800 px-3 mb-2">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href.startsWith("/scans/") && pathname.startsWith("/scans/"));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium transition-colors",
                  isActive
                    ? "bg-zinc-900 text-white font-semibold shadow-sm"
                    : "text-zinc-700 hover:text-zinc-950 hover:bg-sky-100/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-4 border-t border-sky-200/60 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800 px-3 mb-2">
            Resources
          </div>
          <Link
            href="/docs"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium text-zinc-700 hover:text-zinc-950 hover:bg-sky-100/60 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-sky-800" />
            <span>CLI Docs & Rules</span>
          </Link>
        </div>
      </div>

      {/* Logout / User Info */}
      <div className="pt-4 border-t border-sky-200/60">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-sky-100/60 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
