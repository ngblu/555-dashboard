"use client";

import { useState } from "react";
import { FolderKanban, Plus, X, UserCheck, CreditCard, Repeat, Clock, Calendar } from "lucide-react";
import { useData } from "@/lib/store";
import InlineEdit from "@/components/ui/InlineEdit";

export default function ProjectsPage() {
  const { projects, setProjects, createProjectForClient, clients, setClients } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", dueDate: "", value: 0 });

  const addProject = () => {
    if (!form.name) return;
    const newProject = {
      id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: form.name,
      clientId: "",
      client: form.client,
      status: "not-started" as const,
      tier: "full" as const,
      value: form.value,
      progress: 0,
      startDate: new Date().toISOString().split("T")[0],
      dueDate: form.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };
    setProjects([newProject, ...projects]);
    setForm({ name: "", client: "", dueDate: "", value: 0 });
    setShowForm(false);
  };

  const statuses = ["not-started", "in-progress", "review", "completed"];

  const convertToSubscription = (p: { id: string; name: string; client?: string; value: number; clientId?: string }) => {
    // Navigate to subscriptions page with prefilled data via window
    const params = new URLSearchParams();
    if (p.clientId) params.set("clientId", p.clientId);
    params.set("clientName", p.client || p.name);
    params.set("projectId", p.id);
    params.set("amount", String(Math.round(p.value * 0.1))); // 10% monthly default
    window.location.href = "/subscriptions?prefill=" + encodeURIComponent(JSON.stringify({
      clientId: p.clientId || "",
      clientName: p.client || p.name,
      projectId: p.id,
      amount: Math.round(p.value * 0.1)
    }));
  };

  const handleStripe = async (p: { id: string; name: string; value: number }) => {
    if (!p.value) return alert("Set a project value first");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: p.id, name: p.name, amount: Math.round(p.value * 0.5 * 100) }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch (e) {
      alert("Failed: " + String(e));
    }
  };

  const convertToClient = (p: { id: string; name: string; client?: string; value: number; clientId?: string }) => {
    if (p.clientId) {
      // Already linked to a client — just set status
      setClients(clients.map(c => c.id === p.clientId ? { ...c, status: "active" as const } : c));
    } else {
      const newClient = {
        id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: p.client || p.name,
        business: p.client || p.name,
        email: "",
        phone: "",
        website: "",
        status: "active" as const,
        value: p.value,
        notes: "",
        createdAt: new Date().toISOString(),
        fromLeadId: undefined as string | undefined,
      };
      setClients([newClient, ...clients]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="w-6 h-6 text-primary" /> Projects</h1>
          <p className="text-text-secondary text-sm mt-1">{projects.length} projects</p>
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

      {/* Mini Project Timeline */}
      {projects.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">Project Timeline</h2>
            <span className="text-text-muted text-xs">{projects.length} project{projects.length > 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex gap-4" style={{ minWidth: projects.length > 1 ? `${projects.length * 220}px` : "100%" }}>
              {projects.map(p => {
                const startD = p.startDate ? new Date(p.startDate) : null;
                const dueD = p.dueDate ? new Date(p.dueDate) : null;
                const now = new Date();
                const totalDays = (startD && dueD) ? Math.max(1, (dueD.getTime() - startD.getTime()) / 86400000) : 30;
                const elapsedDays = startD ? Math.max(0, (now.getTime() - startD.getTime()) / 86400000) : 0;
                const timeProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                const isOverdue = dueD && dueD < now && p.status !== "completed";
                const statusColor =
                  p.status === "completed" ? "bg-accent" :
                  p.status === "review" ? "bg-secondary" :
                  p.status === "in-progress" ? "bg-primary" :
                  "bg-text-muted";
                return (
                  <div key={p.id} className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-2 shrink-0" style={{ width: "200px" }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-xs font-medium text-text-primary truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      {p.startDate && <span>{p.startDate}</span>}
                      {p.startDate && p.dueDate && <span>→</span>}
                      {p.dueDate && <span className={isOverdue ? "text-danger font-medium" : ""}>{p.dueDate}</span>}
                    </div>
                    {/* Timeline bar */}
                    <div className="w-full h-2 bg-surface rounded-full relative overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${statusColor}`}
                        style={{ width: `${p.progress || timeProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.status === "completed" ? "bg-accent/20 text-accent" :
                        p.status === "review" ? "bg-secondary/20 text-secondary" :
                        p.status === "in-progress" ? "bg-primary/20 text-primary" :
                        "bg-text-muted/20 text-text-muted"
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-[10px] text-text-muted">{p.progress || timeProgress}%</span>
                    </div>
                    {isOverdue && (
                      <span className="text-[10px] text-danger font-medium bg-danger/10 rounded px-1.5 py-0.5 text-center">
                        Overdue
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {projects.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <FolderKanban className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">No projects yet</h3>
            <p className="text-text-muted text-sm max-w-md mx-auto mb-4">Create one from this page or convert a lead from the pipeline.</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        )}
        {projects.map(p => (
          <div key={p.id} className="bg-surface border border-border rounded-xl p-5 group hover:border-border-bright transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-text-primary">{p.name}</h3>
                <p className="text-sm text-text-secondary">{p.client || "No client"}</p>
              </div>
              <button onClick={() => setProjects(projects.filter(x => x.id !== p.id))} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3 text-xs text-text-muted">
              {p.dueDate && <span>Due: {p.dueDate}</span>}
              <InlineEdit
                value={p.value || 0}
                onChange={(val) =>
                  setProjects((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, value: val } : x))
                  )
                }
              />
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full mb-3">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {statuses.map(s => (
                  <button key={s} onClick={() => setProjects(projects.map(x => x.id === p.id ? { ...x, status: s as typeof p.status } : x))} className={`text-[11px] px-2 py-1 rounded-md font-medium capitalize ${p.status === s ? "bg-primary/20 text-primary" : "bg-surface text-text-muted hover:text-text-secondary"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleStripe(p as { id: string; name: string; value: number })} className="flex items-center gap-1 text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20">
                  <CreditCard className="w-3 h-3" /> 50% Deposit
                </button>
                <button onClick={() => convertToSubscription(p)} className="flex items-center gap-1 text-xs px-2 py-1 bg-warning/10 text-warning rounded hover:bg-warning/20">
                  <Repeat className="w-3 h-3" /> To Sub
                </button>
                <button onClick={() => convertToClient(p)} className="flex items-center gap-1 text-xs px-2 py-1 bg-secondary/10 text-secondary rounded hover:bg-secondary/20">
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
