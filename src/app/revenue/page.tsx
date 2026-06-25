"use client";

import { DollarSign, Check } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/lib/store";

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
      <p className="text-accent font-bold">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RevenuePage() {
  const { revenue, setRevenue } = useData();

  const totalEarned = revenue
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const totalPending = revenue
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  // Build last-6-month chart from paid revenue
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const amount = revenue
      .filter((p) => {
        if (p.status !== "paid" || !p.date) return false;
        const pd = new Date(p.date);
        return `${pd.getFullYear()}-${pd.getMonth()}` === key;
      })
      .reduce((s, p) => s + p.amount, 0);
    return { month: MONTHS[d.getMonth()], revenue: amount };
  });

  const togglePaid = (id: string) =>
    setRevenue((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "paid" ? "pending" : "paid" }
          : p
      )
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-accent" /> Revenue
        </h1>
        <p className="text-text-muted text-sm mt-1">Track every dollar in and out</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-xs mb-1">Total Earned</p>
          <p className="text-3xl font-bold text-accent">${totalEarned.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-xs mb-1">Pending</p>
          <p className="text-3xl font-bold text-warning">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-xs mb-1">Total Pipeline</p>
          <p className="text-3xl font-bold text-primary">${(totalEarned + totalPending).toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Monthly Revenue</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1B2E" />
              <XAxis dataKey="month" stroke="#5C5C78" fontSize={12} />
              <YAxis stroke="#5C5C78" fontSize={12} tickFormatter={(v) => "$" + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#00D4FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Payment History</h2>
        {revenue.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            No payments logged yet. Log a deposit or final payment from a project.
          </p>
        ) : (
          <div className="space-y-3">
            {revenue.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-text-primary text-sm font-medium">{p.clientName || "–"}</p>
                  <p className="text-text-muted text-xs">{p.type} · {p.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-text-primary font-bold">${p.amount.toLocaleString()}</p>
                  <button
                    onClick={() => togglePaid(p.id)}
                    className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer ${
                      p.status === "paid"
                        ? "bg-accent/20 text-accent"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {p.status === "paid" && <Check className="w-3 h-3" />}
                    {p.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
