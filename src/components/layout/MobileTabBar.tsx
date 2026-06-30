"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  Crosshair,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Audit" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/connect", icon: MessageSquare, label: "Jarvis" },
  { href: "/tasks", icon: MoreHorizontal, label: "More" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-0 px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <tab.icon
                className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
              />
              <span className="text-[10px] font-medium truncate max-w-[60px]">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-14 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
