"use client";

import { Lightbulb } from "lucide-react";

const tips = [
  "Use Ctrl+N to quickly add leads, tasks, or projects.",
  "The Jarvis AI can help you analyze leads and draft emails.",
  "Track your pipeline health in the Pipeline Snapshot section.",
  "Sync works across devices when you configure Vercel KV.",
  "You can convert a lead to a client and project in one click.",
  "Site audits generate reports with actionable recommendations.",
  "Check the System Status widget to see if your bridge is running.",
  "Mobile users: install as PWA for a native app experience.",
  "Hold Ctrl+K to open the command palette for fast navigation.",
  "Tasks with 'urgent' priority appear in the Urgent Tasks list.",
  "You can inline-edit lead names and statuses by double-clicking.",
  "The koi pond animation is procedurally generated, refresh to see new fish!",
];

export default function DailyTip() {
  const dayIndex = new Date().getDate() % tips.length;
  const tip = tips[dayIndex];

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <p className="text-xs text-text-secondary">
        <span className="text-warning font-semibold">💡 Tip:</span> {tip}
      </p>
    </div>
  );
}
