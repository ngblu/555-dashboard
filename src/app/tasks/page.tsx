"use client";

import { useState } from "react";
import { CheckSquare, Plus, X } from "lucide-react";
import { useData } from "@/lib/store";
import type { Priority } from "@/lib/types";

const priorityColors: Record<Priority, string> = {
  urgent: "bg-danger/20 text-danger border-danger/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-text-muted/20 text-text-muted border-text-muted/30",
};

export default function TasksPage() {
  const { tasks, setTasks } = useData();
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  const removeTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));
  const addTask = () => {
    if (!newTitle.trim()) return;
    setTasks((prev) => [
      {
        id: "t" + Date.now(),
        title: newTitle,
        priority: newPriority,
        completed: false,
        dueDate: "",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewTitle("");
  };

  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CheckSquare className="w-6 h-6 text-primary" /> Tasks</h1>
          <p className="text-text-muted text-sm mt-1">{active.length} active · {done.length} completed</p>
        </div>
        <button onClick={addTask} disabled={!newTitle.trim()} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Add task */}
      <div className="flex gap-3">
        <input
          placeholder="Add a new task..."
          className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm focus:border-primary focus:outline-none"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
        />
        <select
          className="bg-surface border border-border rounded-lg px-3 py-2 text-text-secondary text-sm focus:border-primary focus:outline-none"
          value={newPriority}
          onChange={e => setNewPriority(e.target.value as Priority)}
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={addTask} className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Active tasks */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <CheckSquare className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">No tasks yet</h3>
            <p className="text-text-muted text-sm max-w-md mx-auto">Use the input above to add your first task. Press Enter to save.</p>
          </div>
        )}
        {active.length > 0 && active.sort((a, b) => ["urgent","high","medium","low"].indexOf(a.priority) - ["urgent","high","medium","low"].indexOf(b.priority)).map(task => (
          <div key={task.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 hover:border-border-bright transition-all duration-300 group">
            <button onClick={() => toggleTask(task.id)} className="w-5 h-5 rounded border-2 border-border hover:border-primary transition-colors shrink-0" />
            <span className="text-text-primary text-sm flex-1">{task.title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
            {task.dueDate && <span className="text-text-muted text-xs">{task.dueDate}</span>}
            <button onClick={() => removeTask(task.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <h2 className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">Completed</h2>
          <div className="space-y-2">
            {done.map(task => (
              <div key={task.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3 opacity-50">
                <button onClick={() => toggleTask(task.id)} className="w-5 h-5 rounded border-2 border-accent bg-accent/20 flex items-center justify-center text-accent text-xs shrink-0">✓</button>
                <span className="text-text-muted text-sm flex-1 line-through">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
