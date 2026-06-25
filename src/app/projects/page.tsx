"use client";

import { useState } from "react";
import { FolderKanban, Plus, X, UserCheck, CreditCard } from "lucide-react";
import { useStore, Project } from "@/lib/useStore";

export default function ProjectsPage() {
  const store = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", dueDate: "", value: 0 });

  const addProject = () => {
    if (!form.name) return;
    const project: Project = {
      id: "p" + Date.now(),
      name: form.name,
      client: form.client,
      status: "planning",
      progress: 0,
      value: form.value,
      paid: 0,
      dueDate: form.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };
    store.updateItem("projects", project.id, project as any);
    setForm({ name: "", client: "", dueDate: "", value: 0 });
    setShowForm(false);
  };

  const statuses = ["planning", "building", "review", "launched"];

  const handleStripe = async (project: Project) => {
    if (!project.value) return alert("Set a project value first.");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, name: project.name, amount: Math.round(project.value * 0.5 * 100) }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch (e) {
      alert("Failed to create checkout: " + String(e));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">{store.projects.length} active projects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Project name" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Client name" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
            <input type="date" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            <input type="number" placeholder="Project value ($)" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.value || ""} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addProject} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium">Create Project</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {store.projects.length === 0 && (
          <p className="text-text-muted text-center py-12">No projects yet. Create your first project or convert a lead.</p>
        )}
        {store.projects.map(project => (
          <div key={project.id} className="bg-surface-2 border border-border rounded-xl p-4 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-text-primary">{project.name}</h3>
                <p className="text-sm text-text-secondary">{project.client || "No client assigned"}</p>
              </div>
              <button onClick={() => store.removeItem("projects", project.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3 text-xs text-text-muted">
              {project.dueDate && <span>Due: {project.dueDate}</span>}
              <span className="text-accent font-medium">${project.value.toLocaleString()}</span>
              {project.paid > 0 && <span className="text-accent">Paid: ${project.paid.toLocaleString()}</span>}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-surface rounded-full mb-3">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {statuses.map(s => (
                  <button key={s} onClick={() => store.updateItem("projects", project.id, { status: s })} className={`text-[11px] px-2 py-1 rounded-md font-medium capitalize ${project.status === s ? "bg-primary/20 text-primary" : "bg-surface text-text-muted hover:text-text-secondary"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleStripe(project)} className="flex items-center gap-1 text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20">
                  <CreditCard className="w-3 h-3" /> 50% Deposit
                </button>
                <button onClick={() => store.convertProjectToClient(project)} className="flex items-center gap-1 text-xs px-2 py-1 bg-secondary/10 text-secondary rounded hover:bg-secondary/20">
                  <UserCheck className="w-3 h-3" /> To Client
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
