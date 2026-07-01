"use client";

import { Plus, Search, FileText, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const actions = [
  { icon: Plus, label: "Quick Add", href: "#", action: "quick-add" },
  { icon: Search, label: "Site Audit", href: "/audit" },
  { icon: FileText, label: "New Lead", href: "/leads" },
  { icon: Send, label: "Send Email", href: "/emails" },
];

export default function QuickActions() {
  const router = useRouter();

  const handleAction = (action: string) => {
    if (action === "quick-add") {
      // Dispatch Ctrl+N to open QuickAdd
      window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "n" }));
    }
  };

  return (
    <div className="glass rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-text-secondary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Quick Actions
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              if (a.action) handleAction(a.action);
              else router.push(a.href);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-bright hover:bg-surface-2 transition-all"
          >
            <a.icon className="w-3.5 h-3.5" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
