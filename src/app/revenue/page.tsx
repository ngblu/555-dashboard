"use client";

import { DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyData = [
  { month: "Jan", revenue: 0 },
  { month: "Feb", revenue: 0 },
  { month: "Mar", revenue: 0 },
  { month: "Apr", revenue: 0 },
  { month: "May", revenue: 0 },
  { month: "Jun", revenue: 0 },
];

const payments: { id: string; client: string; amount: number; type: string; date: string; status: string }[] = [];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary">{label}</p>
      <p className="text-accent font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function RevenuePage() {
  const totalEarned = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-accent" /> Revenue</h1>
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
              <YAxis stroke="#5C5C78" fontSize={12} tickFormatter={v => "$" + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#00D4FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Payment History</h2>
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-text-primary text-sm font-medium">{p.client}</p>
                <p className="text-text-muted text-xs">{p.type} — {p.date}</p>
              </div>
              <div className="text-right">
                <p className="text-text-primary font-bold">${p.amount.toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-accent/20 text-accent" : "bg-warning/20 text-warning"}`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
