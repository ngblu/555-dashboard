"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  FolderKanban,
  Crosshair,
  TrendingUp,
  Clock,
  Mail,
  CheckSquare,
  GripVertical,
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
import type { SalesStage, Lead } from "@/lib/types";
import TimeGreeting from "@/components/ui/TimeGreeting";
import DailyTip from "@/components/ui/DailyTip";
import SystemStatus from "@/components/ui/SystemStatus";
import QuickActions from "@/components/ui/QuickActions";
import ActivityFeed from "@/components/ui/ActivityFeed";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

const priorityColors: Record<string, string> = {
  urgent: "bg-danger/20 text-danger border-danger/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-text-muted/20 text-text-muted border-text-muted/30",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---- Widget types ----
type WidgetId = "stats" | "today" | "revenue-chart" | "urgent-tasks" | "pipeline" | "system-status" | "quick-actions" | "activity-feed" | "theme";

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "stats",
  "today",
  "revenue-chart",
  "urgent-tasks",
  "pipeline",
  "system-status",
  "quick-actions",
  "activity-feed",
  "theme",
];

function useWidgetOrder() {
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("555-widget-order");
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetId[];
        // Ensure all widgets are present
        const all = [...new Set([...parsed, ...DEFAULT_WIDGET_ORDER])];
        setOrder(all);
      }
    } catch {}
  }, []);

  const moveWidget = (id: WidgetId, direction: "up" | "down") => {
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      try { localStorage.setItem("555-widget-order", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { order, moveWidget };
}

// ---- Custom Tooltip ----
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

// ---- Widget Wrapper ----
function WidgetWrapper({
  children,
  className,
  widgetId,
}: {
  children: React.ReactNode;
  className?: string;
  widgetId?: WidgetId;
}) {
  const { moveWidget } = useWidgetOrder();

  return (
    <div className={`glass rounded-xl p-4 md:p-6 border border-border hover-lift hover-glow ${className || ""}`}>
      {widgetId && (
        <div className="flex items-center justify-end -mt-1 -mr-1 mb-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => moveWidget(widgetId, "up")}
            className="p-1 text-text-muted hover:text-text-primary rounded"
            title="Move up"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { leads, clients, projects, tasks, revenue, emailLogs } = useData();
  const { order } = useWidgetOrder();

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

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "stats":
        return (
          <WidgetWrapper key={id} widgetId={id}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-surface-2 border border-border rounded-xl p-4 hover:border-border-bright transition-all duration-300"
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
          </WidgetWrapper>
        );

      case "today":
        return (() => {
          const todayStr = new Date().toISOString().split("T")[0];
          const todayDate = new Date(todayStr);
          const weekEnd = new Date(todayDate);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const tasksDueToday = tasks.filter(
            (t) => !t.completed && t.dueDate && t.dueDate.split("T")[0] === todayStr
          );
          const staleEmails = emailLogs.filter(
            (e) =>
              (e.status === "sent" || e.status === "opened") &&
              e.leadId &&
              Date.now() - new Date(e.sentAt).getTime() > 5 * 86400000
          );
          const projectsDueThisWeek = projects.filter((p) => {
            if (!p.dueDate || p.status === "completed") return false;
            const d = new Date(p.dueDate);
            return d >= todayDate && d <= weekEnd;
          });
          const hasTodayItems =
            tasksDueToday.length > 0 || staleEmails.length > 0 || projectsDueThisWeek.length > 0;

          return (
            <WidgetWrapper key={id} widgetId={id}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Today</h2>
                <span className="text-text-muted text-xs">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <DailyTip />
              {!hasTodayItems && (
                <p className="text-text-muted text-xs mt-3">All clear for today. 🎉</p>
              )}
              <div className="grid md:grid-cols-3 gap-4 mt-3">
                {/* Tasks Due Today */}
                <div className="bg-surface-2 rounded-lg p-3 border border-border">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-primary" /> Tasks Due
                  </h3>
                  {tasksDueToday.length === 0 ? (
                    <p className="text-text-muted text-xs">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tasksDueToday.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.priority === "urgent"
                                ? "bg-danger"
                                : t.priority === "high"
                                ? "bg-warning"
                                : "bg-primary"
                            }`}
                          />
                          <span className="text-text-primary">{t.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emails Needing Follow-up */}
                <div className="bg-surface-2 rounded-lg p-3 border border-border">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-warning" /> Follow-ups
                  </h3>
                  {staleEmails.length === 0 ? (
                    <p className="text-text-muted text-xs">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {staleEmails.slice(0, 5).map((e) => {
                        const linkedLead = leads.find((l) => l.id === e.leadId);
                        const days = Math.floor(
                          (Date.now() - new Date(e.sentAt).getTime()) / 86400000
                        );
                        return (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <span className="text-text-primary truncate">
                              {linkedLead?.businessName || e.to}
                            </span>
                            <span className="text-warning font-medium shrink-0 ml-2">{days}d</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Projects Due This Week */}
                <div className="bg-surface-2 rounded-lg p-3 border border-border">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-secondary" /> Due This Week
                  </h3>
                  {projectsDueThisWeek.length === 0 ? (
                    <p className="text-text-muted text-xs">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {projectsDueThisWeek.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-text-primary truncate">{p.name}</span>
                          <span className="text-text-muted shrink-0 ml-2">{p.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </WidgetWrapper>
          );
        })();

      case "revenue-chart":
        return (
          <WidgetWrapper key={id} widgetId={id} className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Revenue Overview</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--pri)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--pri)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brd)" />
                  <XAxis dataKey="month" stroke="var(--txt-3)" fontSize={12} />
                  <YAxis
                    stroke="var(--txt-3)"
                    fontSize={12}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--pri)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetWrapper>
        );

      case "urgent-tasks":
        return (
          <WidgetWrapper key={id} widgetId={id}>
            <h2 className="text-sm font-semibold text-text-primary mb-4">🔥 Urgent Tasks</h2>
            <div className="space-y-3">
              {urgentTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-text-muted">
                  <CheckSquare className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No urgent tasks. Nice work!</p>
                </div>
              )}
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface-2 rounded-lg p-3 border border-border hover:border-border-bright transition-all"
                >
                  <p className="text-text-primary text-sm font-medium">{task.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-text-muted text-[10px]">Due: {task.dueDate}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </WidgetWrapper>
        );

      case "pipeline": {
        // ---- Sales Statistics ----
        const stageLabels: Record<SalesStage, string> = {
          new: "New", contacted: "Contacted", qualified: "Qualified",
          proposal: "Proposal", negotiation: "Negotiation",
          closed_won: "Closed Won", closed_lost: "Closed Lost",
        };
        const STAGE_ORDER: SalesStage[] = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
        const byStage = new Map<SalesStage, Lead[]>();
        STAGE_ORDER.forEach(s => byStage.set(s, []));
        leads.forEach(l => {
          const s = (l.salesStage || "new") as SalesStage;
          byStage.get(s)?.push(l);
        });

        const activeDeals = (byStage.get("new")?.length || 0) +
          (byStage.get("contacted")?.length || 0) +
          (byStage.get("qualified")?.length || 0) +
          (byStage.get("proposal")?.length || 0) +
          (byStage.get("negotiation")?.length || 0);
        const wonCount = byStage.get("closed_won")?.length || 0;
        const lostCount = byStage.get("closed_lost")?.length || 0;
        const totalClosed = wonCount + lostCount;
        const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
        const maxStage = Math.max(...STAGE_ORDER.map(s => byStage.get(s)?.length || 0), 1);

        return (
          <WidgetWrapper key={id} widgetId={id}>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Sales Statistics</h2>

            {/* Top metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-surface-2 rounded-lg p-3 border border-border text-center">
                <p className="text-xl font-bold text-warning">{activeDeals}</p>
                <p className="text-text-muted text-[10px] mt-0.5">Active Pipeline</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 border border-border text-center">
                <p className="text-xl font-bold text-accent">{wonCount}</p>
                <p className="text-text-muted text-[10px] mt-0.5">Deals Won</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 border border-border text-center">
                <p className="text-xl font-bold text-danger">{lostCount}</p>
                <p className="text-text-muted text-[10px] mt-0.5">Deals Lost</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 border border-border text-center">
                <p className="text-xl font-bold text-primary">{conversionRate}%</p>
                <p className="text-text-muted text-[10px] mt-0.5">Conversion Rate</p>
              </div>
            </div>

            {/* Stage breakdown bars */}
            <div className="space-y-1.5">
              {STAGE_ORDER.map(s => {
                const count = byStage.get(s)?.length || 0;
                const pct = Math.round((count / maxStage) * 100);
                const barColor = s === "closed_won" ? "bg-accent" :
                  s === "closed_lost" ? "bg-danger" :
                  s === "new" ? "bg-text-muted" :
                  s === "contacted" ? "bg-primary" :
                  s === "qualified" ? "bg-secondary" : "bg-warning";
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="text-text-muted text-[10px] w-16 shrink-0 text-right">{stageLabels[s]}</span>
                    <div className="flex-1 h-4 bg-surface-2 rounded-full overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%`, minWidth: count > 0 ? "8px" : "0" }}
                      />
                    </div>
                    <span className="text-text-primary text-[10px] w-5 font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </WidgetWrapper>
        );
      }

      case "system-status":
        return <SystemStatus key={id} />;

      case "quick-actions":
        return <QuickActions key={id} />;

      case "activity-feed":
        return <ActivityFeed key={id} />;

      case "theme":
        return <ThemeSwitcher key={id} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <TimeGreeting />
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Your business command center, everything at a glance.
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

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {order.map((id) => {
          // Special case: revenue-chart spans 2 cols
          if (id === "revenue-chart") {
            return (
              <div key={id} className="lg:col-span-2">
                {renderWidget(id)}
              </div>
            );
          }
          if (id === "urgent-tasks") {
            return <div key={id}>{renderWidget(id)}</div>;
          }
          return <div key={id}>{renderWidget(id)}</div>;
        })}
      </div>
    </div>
  );
}
