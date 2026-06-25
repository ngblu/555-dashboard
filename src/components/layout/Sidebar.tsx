"use client";

import { useState } from "react";
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
  Repeat,
  Mail,
  Menu,  
  X,  
} from "lucide-react";
import { useData } from "@/lib/store";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/subscriptions", icon: Repeat, label: "Subscriptions" },
  { href: "/emails", icon: Mail, label: "Emails" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/revenue", icon: DollarSign, label: "Revenue" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { syncStatus } = useData();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const sync = {
    loading: { icon: Loader2, text: "Connecting…", cls: "text-text-muted", spin: true },
    synced: { icon: Cloud, text: "Synced to cloud", cls: "text-accent", spin: false },
    saving: { icon: Loader2, text: "Saving…", cls: "text-primary", spin: true },
    local: { icon: HardDrive, text: "This device only", cls: "text-warning", spin: false },
    offline: { icon: CloudOff, text: "Offline · cached", cls: "text-danger", spin: false },
  }[syncStatus];
  const SyncIcon = sync.icon;

  const navLinks = navItems.map((item) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
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
        <span>{item.label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        )}
      </Link>
    );
  });

  const footer = (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 ${sync.cls}`}>
        <SyncIcon className={`w-3.5 h-3.5 ${sync.spin ? "animate-spin" : ""}`} />
        <span className="text-xs">{sync.text}</span>
      </div>
      <div className="flex items-center gap-3 text-text-muted text-xs">
        <Link href="/privacy" onClick={close} className="hover:text-text-secondary transition-colors">
          Privacy
        </Link>
        <Link href="/terms" onClick={close} className="hover:text-text-secondary transition-colors">
          Terms
        </Link>
        <span className="opacity-40 font-mono text-[10px]">555.CMD v1.0</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-11 h-11 rounded-lg bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-out
          w-64
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo + close */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-extrabold text-sm">5</span>
            </div>
            <div>
              <span className="text-primary font-bold text-sm">555</span>
              <span className="text-text-secondary text-xs ml-1">Command Center</span>
            </div>
          </Link>
          <button
            onClick={close}
            className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navLinks}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {footer}
        </div>
      </aside>

      {/* Desktop spacer so content doesn't overlap fixed sidebar */}
      <div className="hidden lg:block w-64 shrink-0" />
    </>
  );
}
