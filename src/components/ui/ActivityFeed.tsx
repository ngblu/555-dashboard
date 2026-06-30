"use client";

import { Activity, ArrowRight, CheckCircle, Mail, UserPlus, FolderKanban } from "lucide-react";
import { useData } from "@/lib/store";
import { useMemo } from "react";

export default function ActivityFeed() {
  const { leads, clients, projects, tasks, emailLogs } = useData();

  const activities = useMemo(() => {
    const items: {
      icon: typeof Activity;
      text: string;
      time: string;
      color: string;
    }[] = [];

    // Recent leads
    leads
      .slice(0, 3)
      .forEach((l) =>
        items.push({
          icon: UserPlus,
          text: `New lead: ${l.businessName}`,
          time: l.createdAt,
          color: "text-primary",
        })
      );

    // Recent clients
    clients
      .slice(0, 3)
      .forEach((c) =>
        items.push({
          icon: CheckCircle,
          text: `Client: ${c.business}`,
          time: c.createdAt,
          color: "text-accent",
        })
      );

    // Recent projects
    projects
      .slice(0, 2)
      .forEach((p) =>
        items.push({
          icon: FolderKanban,
          text: `Project: ${p.name}`,
          time: p.startDate,
          color: "text-secondary",
        })
      );

    // Recent emails
    emailLogs
      .slice(0, 3)
      .forEach((e) =>
        items.push({
          icon: Mail,
          text: `Email sent to ${e.to}`,
          time: e.sentAt,
          color: "text-warning",
        })
      );

    // Sort by time, most recent first
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [leads, clients, projects, emailLogs]);

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="glass rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-text-secondary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Live Activity Feed
        </h3>
      </div>
      {activities.length === 0 ? (
        <p className="text-text-muted text-xs py-4 text-center">
          No recent activity. Start adding leads to populate your feed.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activities.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <a.icon className={`w-3.5 h-3.5 shrink-0 ${a.color}`} />
              <span className="text-text-secondary truncate flex-1">{a.text}</span>
              <span className="text-text-muted text-[10px] shrink-0">{timeAgo(a.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
