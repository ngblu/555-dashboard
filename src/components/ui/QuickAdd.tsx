"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Crosshair, CheckSquare, FolderKanban } from "lucide-react";
import { useData } from "@/lib/store";
import type { Priority } from "@/lib/types";

type TabType = "lead" | "task" | "project";

export default function QuickAdd() {
  const { setLeads, setTasks, setProjects, addNotification } = useData();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("lead");
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest("[data-quick-add-fab]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Ctrl+N keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const resetForm = () => {
    setBusinessName("");
    setWebsite("");
    setTitle("");
    setPriority("medium");
    setProjectName("");
    setClientName("");
  };

  const submit = () => {
    if (tab === "lead") {
      if (!businessName.trim()) return;
      const id = "l_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setLeads((prev) => [
        {
          id,
          businessName: businessName.trim(),
          website: website.trim(),
          industry: "",
          issues: [],
          status: "found",
          contactEmail: "",
          notes: "",
          audit: null,
          source: "manual",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      addNotification(`New lead added: ${businessName.trim()}`, "success", `/leads`);
    } else if (tab === "task") {
      if (!title.trim()) return;
      setTasks((prev) => [
        {
          id: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          title: title.trim(),
          priority,
          completed: false,
          dueDate: "",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      addNotification(`Task created: ${title.trim()}`, "info", `/tasks`);
    } else if (tab === "project") {
      if (!projectName.trim()) return;
      setProjects((prev) => [
        {
          id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          clientId: "",
          client: clientName.trim() || "No client",
          name: projectName.trim(),
          status: "not-started",
          tier: "full",
          value: 0,
          startDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          progress: 0,
        },
        ...prev,
      ]);
      addNotification(`Project created: ${projectName.trim()}`, "success", `/projects`);
    }
    resetForm();
    setOpen(false);
  };

  const tabs: { key: TabType; icon: typeof Crosshair; label: string }[] = [
    { key: "lead", icon: Crosshair, label: "Lead" },
    { key: "task", icon: CheckSquare, label: "Task" },
    { key: "project", icon: FolderKanban, label: "Project" },
  ];

  return (
    <>
      {/* FAB */}
      <button
        data-quick-add-fab
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-background rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-110 transition-all flex items-center justify-center"
        title="Quick Add (Ctrl+N)"
      >
        <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="relative bg-surface-2 border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Quick Add</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-surface border border-border rounded-lg p-1 mb-4">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors capitalize ${
                    tab === t.key
                      ? "bg-primary/20 text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Forms */}
            {tab === "lead" && (
              <div className="space-y-3">
                <input
                  placeholder="Business Name *"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoFocus
                />
                <input
                  placeholder="Website URL (optional)"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            )}

            {tab === "task" && (
              <div className="space-y-3">
                <input
                  placeholder="Task title *"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoFocus
                />
                <select
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}

            {tab === "project" && (
              <div className="space-y-3">
                <input
                  placeholder="Project name *"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoFocus
                />
                <input
                  placeholder="Client name (optional)"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="px-5 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add {tab}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
