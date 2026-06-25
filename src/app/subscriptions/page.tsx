"use client";

import { useState, useEffect } from "react";
import { Repeat, Plus, X, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useData } from "@/lib/store";

interface Sub {
  id: string;
  clientId: string;
  clientName: string;
  plan: string;
  amount: number;
  interval: string;
  status: string;
  startDate: string;
  nextPayment: string;
}

const PLANS = [
  { name: "Basic Maintenance", amount: 50 },
  { name: "Growth Plan", amount: 150 },
  { name: "Full Service", amount: 500 },
];

function loadSubs(): Sub[] {
  try { return JSON.parse(localStorage.getItem("555-subs") || "[]"); } catch { return []; }
}
function saveSubs(subs: Sub[]) {
  try { localStorage.setItem("555-subs", JSON.stringify(subs)); } catch {}
}

export default function SubscriptionsPage() {
  const { clients } = useData();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", plan: "Basic Maintenance", amount: 50, interval: "monthly" });

  useEffect(() => { setSubs(loadSubs()); }, []);

  const activeSubs = subs.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0);

  const addSub = () => {
    const client = clients.find((c: { id: string }) => c.id === form.clientId);
    const sub: Sub = {
      id: "sub_" + Date.now(),
      clientId: form.clientId,
      clientName: client ? ((client as { business: string; name: string }).business || (client as { name: string }).name) : "Unknown",
      plan: form.plan,
      amount: form.amount,
      interval: form.interval,
      status: "active",
      startDate: new Date().toISOString().split("T")[0],
      nextPayment: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };
    const updated = [sub, ...subs];
    setSubs(updated);
    saveSubs(updated);
    setShowForm(false);
  };

  const removeSub = (id: string) => { const u = subs.filter(s => s.id !== id); setSubs(u); saveSubs(u); };
  const toggleStatus = (id: string) => {
    const u = subs.map(s => s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s);
    setSubs(u); saveSubs(u);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Subscriptions</h1><p className="text-text-secondary text-sm mt-1">Monthly maintenance & retainers</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Add</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "MRR", val: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
          { label: "Active Subs", val: String(activeSubs.length), icon: Repeat, color: "text-text-primary" },
          { label: "Avg/Client", val: activeSubs.length ? `$${Math.round(mrr / activeSubs.length)}` : "$0", icon: TrendingUp, color: "text-text-primary" }]
          .map(s => <div key={s.label} className="bg-surface-2 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><s.icon className="w-3.5 h-3.5" />{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
          </div>)}
      </div>

      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client...</option>
              {clients.map((c: { id: string; business: string; name: string }) => <option key={c.id} value={c.id}>{c.business || c.name || "Unnamed"}</option>)}
            </select>
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.plan} onChange={e => {
              const p = PLANS.find(x => x.name === e.target.value);
              setForm({ ...form, plan: e.target.value, amount: p?.amount || 0 });
            }}>{PLANS.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.amount}/mo</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Amount" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addSub} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium" disabled={!form.clientId}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {subs.length === 0 && <div className="text-center py-12"><Repeat className="w-10 h-10 text-text-muted mx-auto mb-2" /><p className="text-text-muted">No subscriptions yet</p></div>}
        {subs.map(sub => (
          <div key={sub.id} className="bg-surface-2 border border-border rounded-xl p-4 group">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-text-primary">{sub.clientName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary">{sub.plan}</span>
                  <span className="text-lg font-bold text-accent">${sub.amount}</span>
                  <span className="text-xs text-text-muted">/{sub.interval}</span>
                </div>
              </div>
              <button onClick={() => removeSub(sub.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Started {sub.startDate}</span>
              <span>Next: {sub.nextPayment}</span>
            </div>
            <button onClick={() => toggleStatus(sub.id)} className={`text-xs px-3 py-1 rounded-md font-medium ${sub.status === "active" ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
              {sub.status === "active" ? "● Active" : "⏸ Paused"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
