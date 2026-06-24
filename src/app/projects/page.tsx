"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

type Status = "not-started" | "in-progress" | "review" | "completed";
const statusLabels: Record<Status, string> = { "not-started": "Not Started", "in-progress": "In Progress", review: "Review", completed: "Completed" };
const statusColors: Record<Status, string> = {
  "not-started": "bg-text-muted/20 text-text-secondary",
  "in-progress": "bg-primary/20 text-primary",
  review: "bg-warning/20 text-warning",
  completed: "bg-accent/20 text-accent",
};

interface Project {
  id: string;
  name: string;
  client: string;
  status: Status;
  tier: string;
  value: number;
  progress: number;
  dueDate: string;
}

const initialProjects: Project[] = [];

export default function ProjectsPage() {
  const [projects] = useState<Project[]>(initialProjects);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="w-6 h-6 text-secondary" /> Projects</h1>
        <p className="text-text-muted text-sm mt-1">{projects.length} total — {projects.filter(p => p.status === "in-progress").length} active</p>
      </div>

      <div className="space-y-4">
        {projects.map(p => (
          <div key={p.id} className="bg-surface border border-border rounded-xl p-6 hover:border-border-bright transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-text-primary font-semibold text-lg">{p.name}</h3>
                <p className="text-text-muted text-sm">{p.client} — {p.tier}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                <p className="text-accent font-bold mt-1">${p.value.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${p.progress}%`,
                    background: p.progress === 100 ? "#00FF88" : "linear-gradient(90deg, #00D4FF, #7B61FF)",
                  }}
                />
              </div>
              <span className="text-text-muted text-sm font-mono w-12 text-right">{p.progress}%</span>
            </div>
            <p className="text-text-muted text-xs mt-2">Due: {p.dueDate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
