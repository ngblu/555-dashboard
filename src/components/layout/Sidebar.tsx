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
  Bell,
  MessageSquare,
  TrendingUp,
  LogOut,
  Shield,
  Calendar,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";

const adminNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/sales", icon: TrendingUp, label: "Sales" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/subscriptions", icon: Repeat, label: "Subscriptions" },
  { href: "/emails", icon: Mail, label: "Emails" },
  { href: "/admin/users", icon: Shield, label: "Users" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/revenue", icon: DollarSign, label: "Revenue" },
];

const salesmanNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/sales", icon: TrendingUp, label: "My Pipeline" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
];

const managerNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/sales", icon: TrendingUp, label: "Sales Pipeline" },
  { href: "/leads", icon: Crosshair, label: "All Leads" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/admin/users", icon: Shield, label: "Team" },
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
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("555-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
  const router = useRouter();
  const { syncStatus, notifications, user, setUser } = useData();
  const [open, setOpen] = useState(false);
  const { collapsed, toggle, mounted } = useCollapsed();

  const close = () => setOpen(false);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  // Choose nav items based on role
  const navItems = user?.role === "salesman" ? salesmanNavItems : user?.role === "manager" ? managerNavItems : adminNavItems;
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "N";
  const userName = user?.name || "User";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  const sync = {
    loading: {
      icon: Loader2,
      text: "Connecting…",
      cls: "text-text-muted",
      spin: true,
    },
    synced: { icon: Cloud, text: "Synced to cloud", cls: "text-accent", spin: false },
    saving: { icon: Loader2, text: "Saving…", cls: "text-primary", spin: true },
    local: {
      icon: HardDrive,
      text: "This device only",
      cls: "text-warning",
      spin: false,
    },
    offline: {
      icon: CloudOff,
      text: "Offline · cached",
      cls: "text-danger",
      spin: false,
    },
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
          isActive
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <div className="relative shrink-0">
          <item.icon
            className={`w-5 h-5 ${
              isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
            }`}
          />
          {/* Glowing dot for active page — only in collapsed mode */}
          {isActive && collapsed && (
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          )}
        </div>
        {!collapsed && <span>{item.label}</span>}
        {/* Active indicator dot (expanded) */}
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        )}
        {/* Notification badge on nav items (if we tracked per-item counts, use generic here) */}
      </Link>
    );
  });

  const footer = (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""} ${sync.cls}`}
      >
        <SyncIcon className={`w-3.5 h-3.5 ${sync.spin ? "animate-spin" : ""}`} />
        {!collapsed && <span className="text-xs">{sync.text}</span>}
      </div>
      {!collapsed && (
        <div className="flex items-center gap-3 text-text-muted text-xs">
          <Link
            href="/privacy"
            onClick={close}
            className="hover:text-text-secondary transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            onClick={close}
            className="hover:text-text-secondary transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/connect"
            onClick={close}
            className="hover:text-primary transition-colors"
            title="Connect mobile"
          >
            <MessageSquare className="w-3 h-3 inline" />
          </Link>
          <span className="opacity-40 font-mono text-[10px]">v1.0 · 五五五</span>
        </div>
      )}
    </div>
  );

  // Don't render until mounted to avoid flash
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
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden animate-fade-in"
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
        <div
          className={`h-16 flex items-center justify-between px-4 border-b border-border relative ${
            collapsed ? "px-2" : ""
          }`}
        >
          {/* Torii gate red accent — top bar */}
          <div className="absolute top-0 left-0 right-0 torii-accent" />
          <Link
            href="/"
            onClick={close}
            className={`flex items-center gap-2 ${collapsed ? "justify-center w-full" : ""}`}
          >
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

          {/* User avatar / initials — always visible when mobile drawer is open */}
          {(!collapsed || open) && (
            <div className="flex items-center gap-2">
              {/* Notifications bell */}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Toggle notifications panel via custom event
                  window.dispatchEvent(new CustomEvent("toggle-notifications"));
                }}
                className="relative p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-2"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                )}
              </Link>

              {/* User avatar */}
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white shrink-0 border-2 border-border"
                title={userName}
              >
                {userInitial}
              </div>

              {/* Logout */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-surface-2"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              {/* Close button (mobile) */}
              <button
                onClick={close}
                className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {collapsed && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white border border-border">
                {userInitial}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">{navLinks}</nav>

        {/* Collapse toggle (desktop) */}
        <div className={`border-t border-border ${collapsed ? "p-2" : "px-4 py-2"}`}>
          <button
            onClick={toggle}
            className={`flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded-lg transition-all duration-200 w-full ${
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
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          collapsed ? "w-16" : "w-72"
        }`}
      />
    </>
  );
}
