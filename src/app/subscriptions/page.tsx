"use client";

import { useState } from "react";
import { Repeat, Plus, X, CreditCard, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { useStore, Subscription } from "@/lib/useStore";

const PLANS = [
  { name: "Basic Maintenance", amount: 50, features: "Monthly updates, uptime monitoring, security patches" },
  { name: "Growth Plan", amount: 150, features: "Content updates, SEO monitoring, monthly report, priority support" },
  { name: "Full Service", amount: 500, features: "Everything in Growth + blog posts, social media, analytics, weekly calls" },
];

export default function SubscriptionsPage() {
  const store = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", plan: "Basic Maintenance", amount: 50, interval: "monthly" });

  const activeSubs = store.subscriptions.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0);

  const addSubscription = () => {
    const client = store.clients.find(c => c.id === form.clientId);
    const sub: Subscription = {
      id: "sub_" + Date.now(),
      clientId: form.clientId,
      clientName: client?.name || "Unknown Client",
      plan: form.plan,
      amount: form.amount,
      interval: form.interval,
      status: "active",
      startDate: new Date().toISOString().split("T")[0],
      nextPayment: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };
    store.updateItem("subscriptions", sub.id, sub);
    setShowForm(false);
  };

  const toggleStatus = (sub: Subscription) => {
    store.updateItem("subscriptions", sub.id, { status: sub.status === "active" ? "paused" : "active" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-text-secondary text-sm mt-1">Recurring revenue from client maintenance & retainers</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Add Subscription
          </button>
        </div>
      </div>

      {/* MRR Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Monthly Recurring Revenue</div>
          <div className="text-2xl font-bold text-accent">${mrr.toLocaleString()}</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Repeat className="w-3.5 h-3.5" /> Active Subscriptions</div>
          <div className="text-2xl font-bold text-text-primary">{activeSubs.length}</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Avg. Per Client</div>
          <div className="text-2xl font-bold text-text-primary">{activeSubs.length > 0 ? `$${Math.round(mrr / activeSubs.length)}` : "$0"}</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm text-text-primary">New Subscription</h3>
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client...</option>
              {store.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.plan} onChange={e => {
              const plan = PLANS.find(p => p.name === e.target.value);
              setForm({ ...form, plan: e.target.value, amount: plan?.amount || 0 });
            }}>
              {PLANS.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.amount}/mo</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Amount" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addSubscription} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium" disabled={!form.clientId}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {store.subscriptions.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Repeat className="w-10 h-10 text-text-muted mx-auto" />
            <p className="text-text-muted">No subscriptions yet</p>
            <p className="text-text-muted text-xs">This is where you track monthly maintenance, hosting, and SEO retainers from clients</p>
          </div>
        )}
        {store.subscriptions.map(sub => (
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
              <button onClick={() => store.removeItem("subscriptions", sub.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Started {sub.startDate}</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Next: {sub.nextPayment}</span>
            </div>
            <button onClick={() => toggleStatus(sub)} className={`text-xs px-3 py-1 rounded-md font-medium ${sub.status === "active" ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
              {sub.status === "active" ? "● Active" : "⏸ Paused"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
