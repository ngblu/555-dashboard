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

const revenueData = [
  { month: "Jan", amount: 0 },
  { month: "Feb", amount: 0 },
  { month: "Mar", amount: 0 },
  { month: "Apr", amount: 0 },
  { month: "May", amount: 1250 },
  { month: "Jun", amount: 3750 },
];

const stats = [
  {
    label: "Revenue (This Month)",
    value: "$3,750",
    change: "+200%",
    icon: DollarSign,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: "Active Clients",
    value: "2",
    change: "+1 new",
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Active Projects",
    value: "1",
    change: "1 pending",
    icon: FolderKanban,
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    label: "Leads in Pipeline",
    value: "3",
    change: "1 replied",
    icon: Crosshair,
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const recentActivity = [
  { time: "2h ago", text: "GreenEdge homepage hero section completed", type: "project" },
  { time: "5h ago", text: "Sent cold email to Premier Pressure Washing", type: "lead" },
  { time: "1d ago", text: "ClearView final payment received — $1,250", type: "revenue" },
  { time: "1d ago", text: "Found new lead: Spotless Cleaning Co.", type: "lead" },
  { time: "2d ago", text: "GreenEdge deposit received — $1,250", type: "revenue" },
  { time: "3d ago", text: "Prestige Auto Detail proposal sent", type: "client" },
];

const urgentTasks = [
  { title: "Send Prestige proposal PDF", priority: "urgent", due: "Today" },
  { title: "Finish GreenEdge hero section", priority: "high", due: "Jun 20" },
  { title: "Cold email 10 new businesses", priority: "medium", due: "This week" },
];

const priorityColors: Record<string, string> = {
  urgent: "bg-danger/20 text-danger border-danger/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-text-muted/20 text-text-muted border-text-muted/30",
};

const activityColors: Record<string, string> = {
  project: "bg-secondary",
  lead: "bg-warning",
  revenue: "bg-accent",
  client: "bg-primary",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary">{label}</p>
      <p className="text-primary font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Command Center
          </h1>
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
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            Revenue Overview
          </h2>
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
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            🔥 Urgent Tasks
          </h2>
          <div className="space-y-3">
            {urgentTasks.map((task) => (
              <div
                key={task.title}
                className="bg-surface-2 rounded-lg p-3 border border-border"
              >
                <p className="text-text-primary text-sm font-medium">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-text-muted text-[10px]">
                    Due: {task.due}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activityColors[item.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm">{item.text}</p>
                <p className="text-text-muted text-xs">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
