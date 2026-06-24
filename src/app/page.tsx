"use client";

import {
  DollarSign,
  Users,
  FolderKanban,
  Crosshair,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/lib/store";

const priorityColors: Record<string, string> = {
  urgent: "bg-danger/20 text-danger border-danger/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-text-muted/20 text-text-muted border-text-muted/30",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary">{label}</p>
      <p className="text-primary font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { leads, clients, projects, tasks, revenue } = useData();

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const revenueThisMonth = revenue
    .filter((r) => {
      if (r.status !== "paid" || !r.date) return false;
      const d = new Date(r.date);
      return `${d.getFullYear()}-${d.getMonth()}` === thisMonthKey;
    })
    .reduce((s, r) => s + r.amount, 0);

  const activeClients = clients.filter(
    (c) => c.status === "active" || c.status === "completed"
  ).length;
  const activeProjects = projects.filter((p) => p.status === "in-progress").length;
  const openLeads = leads.filter(
    (l) => l.status !== "converted" && l.status !== "dead"
  ).length;

  const stats = [
    {
      label: "Revenue (This Month)",
      value: `$${revenueThisMonth.toLocaleString()}`,
      change: revenueThisMonth > 0 ? "Paid" : "Get started",
      icon: DollarSign,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Active Clients",
      value: String(activeClients),
      change: activeClients > 0 ? `${clients.length} total` : "Add first client",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Active Projects",
      value: String(activeProjects),
      change: projects.length > 0 ? `${projects.length} total` : "None yet",
      icon: FolderKanban,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Leads in Pipeline",
      value: String(openLeads),
      change: openLeads > 0 ? "Working" : "Start prospecting",
      icon: Crosshair,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const revenueData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const amount = revenue
      .filter((r) => {
        if (r.status !== "paid" || !r.date) return false;
        const rd = new Date(r.date);
        return `${rd.getFullYear()}-${rd.getMonth()}` === key;
      })
      .reduce((s, r) => s + r.amount, 0);
    return { month: MONTHS[d.getMonth()], amount };
  });

  const urgentTasks = tasks
    .filter((t) => !t.completed && (t.priority === "urgent" || t.priority === "high"))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Command Center</h1>
          <p className="text-text-muted text-sm mt-1">
            Welcome back, Noah. Here&apos;s your business at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-xl p-5 hover:border-border-bright transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <span className="text-accent text-xs font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-text-muted text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts + Activity Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Revenue Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1B2E" />
                <XAxis dataKey="month" stroke="#5C5C78" fontSize={12} />
                <YAxis stroke="#5C5C78" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#00D4FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">🔥 Urgent Tasks</h2>
          <div className="space-y-3">
            {urgentTasks.length === 0 && (
              <p className="text-text-muted text-xs">No urgent tasks. Nice.</p>
            )}
            {urgentTasks.map((task) => (
              <div key={task.id} className="bg-surface-2 rounded-lg p-3 border border-border">
                <p className="text-text-primary text-sm font-medium">{task.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-text-muted text-[10px]">Due: {task.dueDate}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline snapshot */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Pipeline Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-warning">{leads.length}</p>
            <p className="text-text-muted text-xs mt-1">Total Leads</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{clients.length}</p>
            <p className="text-text-muted text-xs mt-1">Clients</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{projects.length}</p>
            <p className="text-text-muted text-xs mt-1">Projects</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">
              ${revenue.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0).toLocaleString()}
            </p>
            <p className="text-text-muted text-xs mt-1">Pending Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
