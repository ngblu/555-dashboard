"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  LayoutDashboard,
  FileSearch,
  Crosshair,
  FolderKanban,
  Users,
  Repeat,
  CheckSquare,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  label: string;
  icon: typeof Search;
  action: () => void;
  shortcut?: string;
  category: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Go to Overview",
        icon: LayoutDashboard,
        category: "Navigate",
        action: () => router.push("/"),
      },
      {
        id: "audit",
        label: "Go to Site Audit",
        icon: FileSearch,
        category: "Navigate",
        action: () => router.push("/audit"),
      },
      {
        id: "leads",
        label: "Go to Leads",
        icon: Crosshair,
        category: "Navigate",
        action: () => router.push("/leads"),
      },
      {
        id: "projects",
        label: "Go to Projects",
        icon: FolderKanban,
        category: "Navigate",
        action: () => router.push("/projects"),
      },
      {
        id: "clients",
        label: "Go to Clients",
        icon: Users,
        category: "Navigate",
        action: () => router.push("/clients"),
      },
      {
        id: "subscriptions",
        label: "Go to Subscriptions",
        icon: Repeat,
        category: "Navigate",
        action: () => router.push("/subscriptions"),
      },
      {
        id: "tasks",
        label: "Go to Tasks",
        icon: CheckSquare,
        category: "Navigate",
        action: () => router.push("/tasks"),
      },
      {
        id: "revenue",
        label: "Go to Revenue",
        icon: DollarSign,
        category: "Navigate",
        action: () => router.push("/revenue"),
      },
      {
        id: "quick-add",
        label: "Quick Add (Ctrl+N)",
        icon: Plus,
        category: "Actions",
        shortcut: "Ctrl+N",
        action: () => {
          setOpen(false);
          window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "n" }));
        },
      },
    ],
    [router]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-surface-2 border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in">
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[10px] text-text-muted bg-surface border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="text-text-muted text-sm text-center py-8">No results found</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                setOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                i === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              <cmd.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{cmd.label}</span>
              <span className="text-[10px] text-text-muted">{cmd.category}</span>
              {cmd.shortcut && (
                <kbd className="text-[10px] text-text-muted bg-surface border border-border rounded px-1.5 py-0.5">
                  {cmd.shortcut}
                </kbd>
              )}
              {i === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
