"use client";

import { useState } from "react";
import { FolderKanban, Trash2, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";

const statusLabels: Record<ProjectStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  review: "Review",
  completed: "Completed",
};
const statusColors: Record<ProjectStatus, string> = {
  "not-started": "bg-text-muted/20 text-text-secondary",
  "in-progress": "bg-primary/20 text-primary",
  review: "bg-warning/20 text-warning",
  completed: "bg-accent/20 text-accent",
};
const statusFlow: ProjectStatus[] = [
  "not-started",
  "in-progress",
  "review",
  "completed",
];

export default function ProjectsPage() {
  const { projects, setProjects, addRevenueForProject } = useData();
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const cycleStatus = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const idx = statusFlow.indexOf(p.status);
        const next = statusFlow[(idx + 1) % statusFlow.length];
        return {
          ...p,
          status: next,
          progress: next === "completed" ? 100 : p.progress,
        };
      })
    );
  };

  const setProgress = (id: string, progress: number) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              progress,
              status:
                progress === 100
                  ? "completed"
                  : progress > 0 && p.status === "not-started"
                  ? "in-progress"
                  : p.status,
            }
          : p
      )
    );
  };

  const removeProject = (id: string) =>
    setProjects((prev) => prev.filter((p) => p.id !== id));

  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null); // projectId being edited
  const [editAmount, setEditAmount] = useState("");

  const sendStripeInvoice = async (
    projectId: string,
    clientName: string,
    value: number,
    type: "deposit" | "final"
  ) => {
    setPayLoading(projectId);
    const amount = type === "deposit" ? Math.round(value / 2) : value;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, clientName, amount, type }),
      });
      const data = await res.json();
      if (data.url) {
        // Log the pending revenue and open Stripe checkout
        addRevenueForProject(projectId, amount, type, "pending");
        window.open(data.url, "_blank");
        flash(`Stripe checkout opened for ${type}`);
      } else {
        flash(data.error || "Failed to create checkout");
        setPayLoading(null);
        return; // don't log revenue if checkout failed
      }
    } catch (e) {
      flash("Failed to connect to Stripe");
    }
    setPayLoading(null);
  };

  const startEditValue = (id: string, current: number) => {
    setEditingValue(id);
    setEditAmount(current > 0 ? String(current) : "");
  };

  const saveValue = (id: string) => {
    const val = Number(editAmount);
    if (!isNaN(val) && val > 0) {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, value: val } : p))
      );
    }
    setEditingValue(null);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-accent/15 border border-accent/40 text-accent px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-slide-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderKanban className="w-6 h-6 text-secondary" /> Projects
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {projects.length} total ·{" "}
          {projects.filter((p) => p.status === "in-progress").length} active
        </p>
      </div>

      {projects.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <FolderKanban className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-text-primary font-semibold mb-2">No projects yet</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Spin up a project from a lead or client to start tracking the build.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-surface border border-border rounded-xl p-6 hover:border-border-bright transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-text-primary font-semibold text-lg">{p.name}</h3>
                <p className="text-text-muted text-sm">
                  {p.client || "–"} — {p.tier}
                </p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => cycleStatus(p.id)}
                  className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer ${statusColors[p.status]}`}
                >
                  {statusLabels[p.status]}
                </button>
                {editingValue === p.id ? (
                  <div className="mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-accent font-bold">$</span>
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onBlur={() => saveValue(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveValue(p.id);
                          if (e.key === "Escape") setEditingValue(null);
                        }}
                        className="w-24 bg-surface-2 border border-primary rounded px-2 py-1 text-accent font-bold text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditValue(p.id, p.value)}
                    className="text-accent font-bold mt-1 cursor-pointer hover:underline text-left"
                    title="Click to set project value"
                  >
                    ${p.value.toLocaleString()}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={p.progress}
                onChange={(e) => setProgress(p.id, Number(e.target.value))}
                className="flex-1 accent-primary cursor-pointer"
              />
              <span className="text-text-muted text-sm font-mono w-12 text-right">{p.progress}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${p.progress}%`,
                  background:
                    p.progress === 100
                      ? "#00FF88"
                      : "linear-gradient(90deg, #00D4FF, #7B61FF)",
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sendStripeInvoice(p.id, p.client, p.value, "deposit")}
                  disabled={payLoading === p.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {payLoading === p.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Send Deposit Invoice (50%)
                </button>
                <button
                  onClick={() => sendStripeInvoice(p.id, p.client, p.value, "final")}
                  disabled={payLoading === p.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {payLoading === p.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Send Final Invoice
                </button>
              </div>
              <div className="flex items-center gap-3">
                {p.dueDate && (
                  <span className="text-text-muted text-xs">Due: {p.dueDate}</span>
                )}
                <button
                  onClick={() => removeProject(p.id)}
                  className="text-text-muted hover:text-danger p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
