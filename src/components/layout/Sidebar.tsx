"use client";

import { useState, useEffect } from "react";
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
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useData } from "@/lib/store";
import KoiPond from "@/components/ui/KoiPond";

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

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("555-sidebar-collapsed");
      setCollapsed(v === "true");
    } catch {}
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("555-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  // Set CSS variable on root so layout can respond
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "4rem" : "18rem"
    );
    document.documentElement.setAttribute(
      "data-sidebar-collapsed",
      collapsed ? "true" : "false"
    );
  }, [collapsed, mounted]);

  return { collapsed, toggle, mounted };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { syncStatus } = useData();
  const [open, setOpen] = useState(false);
  const { collapsed, toggle, mounted } = useCollapsed();

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
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isActive
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <item.icon
          className={`w-5 h-5 shrink-0 ${
            isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
          }`}
        />
        {!collapsed && <span>{item.label}</span>}
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        )}
        {isActive && collapsed && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        )}
      </Link>
    );
  });

  const footer = (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""} ${sync.cls}`}>
        <SyncIcon className={`w-3.5 h-3.5 ${sync.spin ? "animate-spin" : ""}`} />
        {!collapsed && <span className="text-xs">{sync.text}</span>}
      </div>
      {!collapsed && (
        <div className="flex items-center gap-3 text-text-muted text-xs">
          <Link href="/privacy" onClick={close} className="hover:text-text-secondary transition-colors">
            Privacy
          </Link>
          <Link href="/terms" onClick={close} className="hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <span className="opacity-40 font-mono text-[10px]">v1.0 ・ 五五五</span>
        </div>
      )}
    </div>
  );

  // Don't render anything until mounted to avoid flash
  if (!mounted) {
    return (
      <>
        <div className="hidden lg:block w-72 shrink-0" />
      </>
    );
  }

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
        className={`fixed left-0 top-0 bottom-0 z-40 bg-surface border-r border-border flex flex-col transition-all duration-300 ease-out
          seigaiha-bg
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-16" : "w-72"}
        `}
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.02) 0%, transparent 60%)`,
        }}
      >
        {/* Logo + close */}
        <div className={`h-16 flex items-center justify-between px-4 border-b border-border relative ${collapsed ? "px-2" : ""}`}>
          {/* Torii gate red accent — top bar */}
          <div className="absolute top-0 left-0 right-0 torii-accent" />
          <Link href="/" onClick={close} className={`flex items-center gap-2 ${collapsed ? "justify-center w-full" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center relative overflow-hidden shrink-0">
              <span className="text-primary font-extrabold text-sm">5</span>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(0,212,255,0.15)_0%,_transparent_70%)]" />
            </div>
            {!collapsed && (
              <div>
                <span className="text-primary font-bold text-sm">555</span>
                <span className="text-text-secondary text-[10px] ml-1">コマンド</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <span className="text-[#E8302A]/40 text-xs font-bold select-none" title="金 (gold)">金</span>
              <button
                onClick={close}
                className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navLinks}
        </nav>

        {/* Koi Pond */}
        {!collapsed && (
          <div className="px-3 pb-3 flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-2 w-full max-w-[200px]">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
              <span className="text-[10px] text-text-muted tracking-widest uppercase select-none">錦鯉</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
            </div>
            <KoiPond />
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "px-4 py-2"}`}>
          <button
            onClick={toggle}
            className={`flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors w-full ${
              collapsed ? "justify-center p-2" : "px-2 py-1.5"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "p-4"}`}>
          {footer}
        </div>
      </aside>

      {/* Desktop spacer so content doesn't overlap fixed sidebar */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-72"}`} />
    </>
  );
}
