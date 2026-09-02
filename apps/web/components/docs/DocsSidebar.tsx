"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Terminal, GitBranch, FileSearch, HelpCircle } from "lucide-react";

export const DOCS_NAV_ITEMS = [
  {
    title: "Getting Started",
    items: [
      { label: "Overview", href: "/docs", icon: BookOpen },
      { label: "Installation", href: "/docs/installation", icon: Terminal },
    ],
  },
  {
    title: "Integrations & Setup",
    items: [
      { label: "GitHub Action", href: "/docs/github-action", icon: GitBranch },
      { label: "Understanding Reports", href: "/docs/understanding-reports", icon: FileSearch },
    ],
  },
  {
    title: "Help & Community",
    items: [
      { label: "FAQ", href: "/docs/faq", icon: HelpCircle },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full space-y-8">
      {DOCS_NAV_ITEMS.map((group) => (
        <div key={group.title} className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-3">
            {group.title}
          </h4>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium transition-all",
                      isActive
                        ? "bg-zinc-900 text-white font-semibold shadow-sm"
                        : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
