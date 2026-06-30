"use client";

import { useState } from "react";
import { CheckSquare, Plus, X, Send, Loader2, Sparkles, MessageSquare, Globe, Search, Mail, FileText, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";

const taskTypes = [
  { value: "manual", label: "Manual Task", icon: CheckSquare },
  { value: "ai_build", label: "AI: Build Website", icon: Globe, desc: "Tell me about the business and I'll build their website" },
  { value: "ai_audit", label: "AI: Run Audit", icon: Search, desc: "I'll audit their site and prepare a report" },
  { value: "ai_email", label: "AI: Draft Email", icon: Mail, desc: "Give me context and I'll write a cold email" },
  { value: "ai_research", label: "AI: Research", icon: FileText, desc: "Research competitors, industry, or strategy" },
];

export default function TasksPage() {
  const { tasks, setTasks, projects, addNotification } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", projectId: "", priority: "medium" as const, dueDate: "", taskType: "manual" as const, aiContext: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const addTask = () => {
    if (!form.title.trim()) return;
    const task = {
      id: "t_" + Date.now().toString(36),
      title: form.title.trim(),
      projectId: form.projectId || undefined,
      priority: form.priority,
      completed: false,
      dueDate: form.dueDate || undefined,
      createdAt: new Date().toISOString(),
      taskType: form.taskType,
      messages: [] as any[],
      aiContext: form.taskType !== "manual" ? form.aiContext || undefined : undefined,
    };
    setTasks([task, ...tasks]);
    setForm({ title: "", projectId: "", priority: "medium", dueDate: "", taskType: "manual", aiContext: "" });
    setShowForm(false);
    setSelectedId(task.id);
    addNotification(`Task created: ${task.title}`, "info", "/tasks");
  };

  const selected = tasks.find((t: { id: string }) => t.id === selectedId) as any;
  const isAiTask = selected?.taskType && selected.taskType !== "manual";

  const handleSendMessage = () => {
    if (!message.trim() || !selectedId) return;
    const msg = { id: "m_" + Date.now(), author: "user", text: message.trim(), createdAt: new Date().toISOString() };
    setTasks(tasks.map((t: any) => t.id === selectedId ? { ...t, messages: [...(t.messages || []), msg] } : t) as any);
    setMessage("");
    // Auto-trigger AI processing
    processAiTask(selectedId, message.trim());
  };

  const processAiTask = async (taskId: string, userMessage: string) => {
    setProcessing(taskId);
    const task = tasks.find((t: { id: string }) => t.id === taskId) as any;
    if (!task) return;

    // Simulate AI thinking + response
    await new Promise(r => setTimeout(r, 1500));

    let aiResponse = "";
    const context = task.aiContext || "";
    const allMessages = [...(task.messages || []), { id: "m_temp", author: "user", text: userMessage, createdAt: new Date().toISOString() }];

    if (task.taskType === "ai_build") {
      aiResponse = `Got it, Noah! I'll start building the website for this business. Here's what I'm going to do:\n\n1. **Scaffold** a new Next.js 16 project with Tailwind v4\n2. **Design** a custom theme matching their brand\n3. **Build** all sections: hero, services, about, reviews, contact\n4. **Optimize** for mobile, SEO, and speed\n\nI'll post updates here as I go. Want me to start, or do you have specific design preferences?`;
    } else if (task.taskType === "ai_audit") {
      aiResponse = `I'll run a full audit right now. Once done, I'll attach the report here with scores, issues, and recommendations. You'll be able to share it directly with the client.\n\nRunning audit now...`;
    } else if (task.taskType === "ai_email") {
      aiResponse = `Here's a draft based on your context:\n\n---\n\nHi there,\n\nI ran a quick audit on your website and found some things that might be costing you customers.\n\nI'm Noah, I run 555 Digital, I help businesses like yours turn their websites into actual customer pipelines. I'd love to send you a free audit report, no strings attached.\n\nWant me to send it over?\n\nBest,\nNoah\n555 Digital`;
    } else if (task.taskType === "ai_research") {
      aiResponse = `I'll research this and come back with findings. Here's what I'm looking into:\n\n• Competitor analysis in the area\n• Local SEO opportunities\n• Industry benchmarks for website performance\n• Common conversion patterns for this industry\n\nI'll post detailed findings here. Give me a few minutes.`;
    } else {
      aiResponse = `Got it, Noah! I understand what you need. Let me work on this and get back to you.`;
    }

    const aiMsg = { id: "m_" + Date.now(), author: "ai", text: aiResponse, createdAt: new Date().toISOString() };
    setTasks(tasks.map((t: any) => t.id === taskId ? { ...t, messages: [...(t.messages || []), aiMsg] } : t) as any);
    addNotification(`AI responded to: ${task.title}`, "success", "/tasks");
    setProcessing(null);
  };

  const toggleComplete = (id: string) => {
    setTasks(tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t) as any);
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-danger/20 text-danger border-danger/30",
    high: "bg-warning/20 text-warning border-warning/30",
    medium: "bg-primary/20 text-primary border-primary/30",
    low: "bg-text-muted/20 text-text-muted border-text-muted/30",
  };

  const taskTypeBadge = (type: string) => {
    if (type === "manual") return null;
    const label = type.replace("ai_", "").replace("_", " ");
    return <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded flex items-center gap-1 shrink-0"><Sparkles className="w-2.5 h-2.5" />{label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CheckSquare className="w-6 h-6 text-primary" /> Tasks</h1>
          <p className="text-text-secondary text-sm mt-1">{tasks.length} tasks · {(tasks as any[]).filter((t: any) => t.completed).length} done</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Task</button>
      </div>

      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Task title *" className="col-span-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Link to project (optional)</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <select className="col-span-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value as typeof form.taskType })}>
              {taskTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {form.taskType !== "manual" && (
              <textarea placeholder="Tell me what you need... (e.g., 'Build a plumbing website for this client. Same style as the Pyburn demo. Add emergency banner and service areas.'" className="col-span-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted h-24 resize-none" value={form.aiContext} onChange={e => setForm({ ...form, aiContext: e.target.value })} />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addTask} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium">Create Task</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-1 space-y-2">
          {(tasks as any[]).length === 0 && (
            <div className="text-center py-12 bg-surface border border-border rounded-xl">
              <CheckSquare className="w-10 h-10 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No tasks yet</p>
              <p className="text-text-muted text-xs mt-1">Create a task or ask me to build something</p>
            </div>
          )}
          {(tasks as any[]).map((t: any) => (
            <div key={t.id} onClick={() => setSelectedId(selectedId === t.id ? null : t.id)} className={`bg-surface border rounded-xl p-4 cursor-pointer transition-all ${selectedId === t.id ? "border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.05)]" : "border-border hover:border-border-bright"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleComplete(t.id); }} className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${t.completed ? "bg-accent border-accent" : "border-text-muted"}`}>
                      {t.completed && <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className={`text-sm ${t.completed ? "line-through text-text-muted" : "text-text-primary font-medium"}`}>{t.title}</span>
                    {taskTypeBadge(t.taskType)}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-6">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[t.priority] || priorityColors.medium}`}>{t.priority}</span>
                    {t.messages?.length > 0 && <span className="text-[10px] text-text-muted flex items-center gap-1"><MessageSquare className="w-3 h-3" />{t.messages.length}</span>}
                    {t.dueDate && <span className="text-[10px] text-text-muted">{t.dueDate}</span>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setTasks((tasks as any[]).filter((x: any) => x.id !== t.id) as any); }} className="text-text-muted hover:text-danger shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Task Detail / Chat Panel */}
        <div className="lg:col-span-2">
          {!selected && (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-30" />
              <h3 className="text-text-primary font-semibold mb-2">Select a task</h3>
              <p className="text-text-muted text-sm max-w-sm mx-auto">Click any task to see details. AI tasks have a chat thread where we can talk and I can work on your request.</p>
            </div>
          )}

          {selected && (
            <div className="bg-surface border border-border rounded-xl flex flex-col h-[calc(100vh-12rem)]">
              {/* Header */}
              <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-text-primary">{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {taskTypeBadge(selected.taskType)}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[selected.priority] || priorityColors.medium}`}>{selected.priority}</span>
                    {selected.projectId && <span className="text-[10px] text-text-muted">· {projects.find((p: any) => p.id === selected.projectId)?.name || "Linked project"}</span>}
                  </div>
                </div>
                <button onClick={() => toggleComplete(selected.id)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${selected.completed ? "bg-accent/10 text-accent" : "bg-surface-2 text-text-secondary hover:text-text-primary"}`}>
                  {selected.completed ? "✓ Done" : "Mark Done"}
                </button>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* AI Context */}
                {selected.aiContext && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 text-sm text-text-secondary">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold block mb-1">Your Request</span>
                    {selected.aiContext}
                  </div>
                )}

                {/* Welcome message for empty AI tasks */}
                {isAiTask && (!selected.messages || selected.messages.length === 0) && (
                  <div className="text-center py-8">
                    <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                    <p className="text-text-muted text-sm">Ready to work on this. Send me a message and I'll get started.</p>
                  </div>
                )}

                {/* Messages */}
                {(selected.messages || []).map((m: any) => (
                  <div key={m.id} className={`flex ${m.author === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${m.author === "user" ? "bg-primary text-background" : "bg-surface-2 text-text-primary border border-border"}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                      <div className={`text-[10px] mt-1.5 ${m.author === "user" ? "text-background/60" : "text-text-muted"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Processing indicator */}
                {processing === selected.id && (
                  <div className="flex justify-start">
                    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-sm text-text-secondary">Working on it...</span>
                    </div>
                  </div>
                )}

                {/* Result */}
                {selected.result && (
                  <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
                    <span className="text-[10px] uppercase tracking-wider text-accent font-semibold block mb-1">Result</span>
                    <p className="text-sm text-text-secondary">{selected.result}</p>
                  </div>
                )}
              </div>

              {/* Input */}
              {isAiTask && (
                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <input
                      placeholder={processing === selected.id ? "AI is working..." : `Message about "${selected.title}"...`}
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                      disabled={processing === selected.id}
                    />
                    <button onClick={handleSendMessage} disabled={!message.trim() || processing === selected.id} className="px-4 py-2.5 bg-primary text-background rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {!isAiTask && (
                <div className="border-t border-border p-4 text-center">
                  <p className="text-text-muted text-xs">This is a manual task. Create an AI task to chat with me here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
