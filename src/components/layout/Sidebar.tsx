"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, DollarSign,
  CheckSquare, Crosshair, FileSearch, Repeat,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/audit", icon: FileSearch, label: "Site Audit" },
  { href: "/leads", icon: Crosshair, label: "Leads" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/subscriptions", icon: Repeat, label: "Subscriptions" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/revenue", icon: DollarSign, label: "Revenue" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex flex-col z-40">
      <Link href="/" className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-[10px] font-black text-background">5</div>
        <span className="font-bold text-sm text-text-primary tracking-tight">555<span className="text-primary">Command</span></span>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">555 Digital</p>
        <p className="text-xs text-text-secondary mt-0.5">Command Center v1</p>
      </div>
    </aside>
  );
}
