"use client";

import { useState } from "react";
import { FolderKanban, DollarSign, Trash2, CheckCircle2 } from "lucide-react";
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

  const logPayment = (
    id: string,
    value: number,
    type: "deposit" | "final"
  ) => {
    const amount = type === "deposit" ? Math.round(value / 2) : value;
    addRevenueForProject(id, amount, type, "pending");
    flash(`${type === "deposit" ? "Deposit" : "Final"} payment logged ($${amount.toLocaleString()}) ✓`);
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
                <p className="text-accent font-bold mt-1">${p.value.toLocaleString()}</p>
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
                  onClick={() => logPayment(p.id, p.value, "deposit")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Log Deposit
                </button>
                <button
                  onClick={() => logPayment(p.id, p.value, "final")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Log Final
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
