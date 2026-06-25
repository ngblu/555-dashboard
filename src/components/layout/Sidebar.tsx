"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DollarSign,
  CheckSquare,
  Crosshair,
  FileSearch,
  Cloud,
  CloudOff,
  Loader2,
  HardDrive,
} from "lucide-react";
import { useData } from "@/lib/store";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/revenue", icon: DollarSign, label: "Revenue" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { syncStatus } = useData();

  const sync = {
    loading: { icon: Loader2, text: "Connecting…", cls: "text-text-muted", spin: true },
    synced: { icon: Cloud, text: "Synced to cloud", cls: "text-accent", spin: false },
    saving: { icon: Loader2, text: "Saving…", cls: "text-primary", spin: true },
    local: { icon: HardDrive, text: "This device only", cls: "text-warning", spin: false },
    offline: { icon: CloudOff, text: "Offline — cached", cls: "text-danger", spin: false },
  }[syncStatus];
  const SyncIcon = sync.icon;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-64 bg-surface border-r border-border z-40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-extrabold text-sm">5</span>
          </div>
          <div className="hidden lg:block">
            <span className="text-primary font-bold text-sm">555</span>
            <span className="text-text-secondary text-xs ml-1">Command Center</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                }`}
              />
              <span className="hidden lg:block">{item.label}</span>
              {isActive && (
                <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="border-t border-border p-4 hidden lg:block">
        <div className={`flex items-center gap-2 ${sync.cls}`}>
          <SyncIcon className={`w-3.5 h-3.5 ${sync.spin ? "animate-spin" : ""}`} />
          <span className="text-xs">{sync.text}</span>
        </div>
        <p className="text-text-muted text-[10px] mt-1 font-mono opacity-60">
          555.CMD v1.0
        </p>
      </div>

      {/* Collapsed status dot (mobile/narrow) */}
      <div className="border-t border-border p-4 lg:hidden flex justify-center">
        <SyncIcon className={`w-4 h-4 ${sync.cls} ${sync.spin ? "animate-spin" : ""}`} />
      </div>
    </aside>
  );
}
