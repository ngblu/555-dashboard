"use client";

import { useState, useEffect } from "react";
import { Repeat, Plus, X, Calendar, DollarSign, TrendingUp, Link as LinkIcon, CreditCard, ExternalLink, Globe, BarChart3, Phone, Mail, MapPin, Activity, Layers } from "lucide-react";
import { useData } from "@/lib/store";

const PLANS = [
  { name: "Basic Maintenance", amount: 50 },
  { name: "Growth Plan", amount: 150 },
  { name: "Full Service", amount: 500 },
];

export default function SubscriptionsPage() {
  const { subscriptions, setSubscriptions, clients, projects, leads, audits, revenue } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", projectId: "", plan: "Basic Maintenance", amount: 50, interval: "monthly" as const });
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState<string | null>(null);

  const activeSubs = subscriptions.filter((s: { status: string }) => s.status === "active");
  const mrr = activeSubs.reduce((sum: number, s: { amount: number }) => sum + s.amount, 0);

  // Prefill handler
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  useEffect(() => {
    if (prefillLoaded) return;
    const search = new URLSearchParams(window.location.search);
    const prefill = search.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setForm({ clientId: data.clientId || "", projectId: data.projectId || "", plan: "Growth Plan", amount: data.amount || 150, interval: "monthly" });
        setShowForm(true);
        setPrefillLoaded(true);
        window.history.replaceState({}, "", "/subscriptions");
      } catch {}
    }
  }, [prefillLoaded]);

  const addSub = () => {
    const client = clients.find((c: { id: string }) => c.id === form.clientId);
    const sub = {
      id: "sub_" + Date.now(),
      clientId: form.clientId,
      clientName: client ? ((client as { business: string }).business || (client as { name: string }).name) : "Unknown",
      projectId: form.projectId || undefined,
      plan: form.plan,
      amount: form.amount,
      interval: form.interval,
      status: "active" as const,
      startDate: new Date().toISOString().split("T")[0],
      nextPayment: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };
    setSubscriptions([sub, ...subscriptions]);
    setShowForm(false);
  };

  const toggleStatus = (id: string) => {
    setSubscriptions(subscriptions.map((s: { id: string; status: string }) => s.id === id ? { ...s, status: s.status === "active" ? "paused" as const : "active" as const } : s) as any);
  };

  const removeSub = (id: string) => {
    setSubscriptions(subscriptions.filter((s: { id: string }) => s.id !== id));
    if (selectedSub === id) setSelectedSub(null);
  };

  const createStripeLink = async (sub: { id: string; clientName: string; clientId: string; amount: number; plan: string }) => {
    setCreatingLink(sub.id);
    try {
      const client = clients.find((c: { id: string }) => c.id === sub.clientId);
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: sub.clientName, clientEmail: (client as { email?: string })?.email || "", plan: sub.plan, amount: sub.amount }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else alert(data.error || "Failed to create link");
    } catch (e) { alert("Error: " + String(e)); }
    setCreatingLink(null);
  };

  // Get full client stats for drawer
  const selectedSubData = selectedSub ? subscriptions.find((s: { id: string }) => s.id === selectedSub) : null;
  const selectedClient = selectedSubData ? clients.find((c: { id: string }) => c.id === selectedSubData.clientId) : null;
  const clientProjects = selectedClient ? projects.filter((p: { clientId: string }) => p.clientId === selectedClient.id) : [];
  const clientRevenue = selectedClient ? revenue.filter((r: { projectId: string }) => clientProjects.some((p: { id: string }) => p.id === r.projectId)) : [];
  const clientLeads = selectedClient ? leads.filter((l: { website: string }) => selectedClient.website && l.website === selectedClient.website) : [];
  const clientAudits = selectedClient ? audits.filter((a: { url: string }) => selectedClient.website && a.url === selectedClient.website) : [];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Repeat className="w-6 h-6 text-primary" /> Subscriptions</h1><p className="text-text-secondary text-sm mt-1">Monthly maintenance &amp; retainers, create Stripe links, manage billing</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Add</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "MRR", val: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
          { label: "Active Subs", val: String(activeSubs.length), icon: Repeat, color: "text-text-primary" },
          { label: "Avg/Client", val: activeSubs.length ? `$${Math.round(mrr / activeSubs.length)}` : "$0", icon: TrendingUp, color: "text-text-primary" }]
          .map(s => <div key={s.label} className="bg-surface-2 border border-border rounded-xl p-4 hover:border-border-bright transition-all duration-300">
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
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Linked project (optional)</option>
              {projects.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.plan} onChange={e => {
              const p = PLANS.find(x => x.name === e.target.value);
              setForm({ ...form, plan: e.target.value, amount: p?.amount || 0 });
            }}>{PLANS.map(p => <option key={p.name} value={p.name}>{p.name}, ${p.amount}/mo</option>)}</select>
            <input type="number" placeholder="Amount" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addSub} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium" disabled={!form.clientId}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {subscriptions.length === 0 && <div className="text-center py-12"><Repeat className="w-10 h-10 text-text-muted mx-auto mb-2" /><p className="text-text-muted">No subscriptions yet</p></div>}
        {subscriptions.map((sub: { id: string; clientName: string; plan: string; amount: number; interval: string; status: string; startDate: string; nextPayment: string; projectId?: string; clientId?: string }) => {
          const linkedProject = sub.projectId ? projects.find((p: { id: string }) => p.id === sub.projectId) : null;
          const isSelected = selectedSub === sub.id;
          return (
            <div key={sub.id} className={`bg-surface-2 border rounded-xl p-4 group transition-all cursor-pointer ${isSelected ? "border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.05)]" : "border-border hover:border-border-bright"}`} onClick={() => setSelectedSub(isSelected ? null : sub.id)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-text-primary">{sub.clientName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary">{sub.plan}</span>
                    <span className="text-lg font-bold text-accent">${sub.amount}</span>
                    <span className="text-xs text-text-muted">/{sub.interval}</span>
                    {linkedProject && <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded flex items-center gap-1"><LinkIcon className="w-2.5 h-2.5" />{linkedProject.name}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => createStripeLink({ ...sub, clientId: sub.clientId || "" })} disabled={creatingLink === sub.id} className="text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> {creatingLink === sub.id ? "..." : "Pay Link"}
                  </button>
                  <button onClick={() => toggleStatus(sub.id)} className={`text-xs px-2 py-1 rounded font-medium ${sub.status === "active" ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
                    {sub.status === "active" ? "● Active" : "⏸ Paused"}
                  </button>
                  <button onClick={() => removeSub(sub.id)} className="text-text-muted hover:text-danger"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Started {sub.startDate}</span>
                <span>Next: {sub.nextPayment}</span>
              </div>
              {isSelected && <div className="mt-3 text-xs text-primary/60">▼ Click a client stat below to expand</div>}
            </div>
          );
        })}
      </div>

      {/* Client Stats Drawer */}
      {selectedSubData && selectedClient && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-40 overflow-y-auto animate-slide-in-right">
          <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{selectedClient.business}</h2>
              <p className="text-text-secondary text-xs">{selectedClient.name || "No contact name"}</p>
            </div>
            <button onClick={() => setSelectedSub(null)} className="text-text-muted hover:text-text-primary p-1"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2 rounded-lg p-3 text-center">
                <div className="text-accent text-lg font-bold">${selectedSubData.amount}</div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider">/{selectedSubData.interval}</div>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 text-center">
                <div className="text-primary text-lg font-bold">{selectedSubData.plan}</div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider">Plan</div>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 text-center">
                <div className="text-accent text-lg font-bold">{clientProjects.length}</div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider">Projects</div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold">Contact</h3>
              <div className="space-y-2">
                {selectedClient.email && <div className="flex items-center gap-2 text-sm text-text-secondary"><Mail className="w-3.5 h-3.5 text-primary" />{selectedClient.email}</div>}
                {selectedClient.phone && <div className="flex items-center gap-2 text-sm text-text-secondary"><Phone className="w-3.5 h-3.5 text-primary" />{selectedClient.phone}</div>}
                {selectedClient.website && (
                  <a href={selectedClient.website.startsWith("http") ? selectedClient.website : `https://${selectedClient.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="w-3.5 h-3.5" />{selectedClient.website} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!selectedClient.email && !selectedClient.phone && !selectedClient.website && <p className="text-text-muted text-xs">No contact info added yet</p>}
              </div>
            </div>

            {/* Audit Scores */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" />Website Audit</h3>
              {clientAudits.length > 0 ? (
                <div className="space-y-2">
                  {clientAudits.map((a: any) => a.result && (
                    <div key={a.id} className="bg-surface-2 rounded-lg p-3">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1"><span className="text-text-muted">Performance</span><span className={a.result.performance > 70 ? "text-accent" : "text-warning"}>{a.result.performance}/100</span></div>
                          <div className="w-full h-1.5 bg-surface rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${a.result.performance}%` }} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs mt-2">
                        <span className="text-text-muted">SEO: <span className="text-text-secondary">{a.result.seo}/100</span></span>
                        <span className="text-text-muted">A11y: <span className="text-text-secondary">{a.result.accessibility}/100</span></span>
                        <span className="text-text-muted">FCP: <span className="text-text-secondary">{a.result.fcp}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-xs">No audits yet. Run one from the <a href="/audit" className="text-primary hover:underline">Audit page</a>.</p>
              )}
            </div>

            {/* Projects */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold flex items-center gap-2"><Layers className="w-3.5 h-3.5" />Projects ({clientProjects.length})</h3>
              {clientProjects.length > 0 ? (
                <div className="space-y-2">
                  {clientProjects.map((p: any) => (
                    <div key={p.id} className="bg-surface-2 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-text-primary">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === "completed" ? "bg-accent/10 text-accent" : p.status === "in-progress" ? "bg-primary/10 text-primary" : "bg-text-muted/10 text-text-muted"}`}>{p.status}</span>
                      </div>
                      <div className="w-full h-1 bg-surface rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${p.progress || 0}%` }} /></div>
                      <div className="flex justify-between mt-1.5 text-xs text-text-muted">
                        <span>Due: {p.dueDate || "N/A"}</span>
                        <span className="text-accent">${p.value?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-text-muted text-xs">No projects linked</p>}
            </div>

            {/* Revenue */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />Revenue</h3>
              {clientRevenue.length > 0 ? (
                <div className="space-y-1.5">
                  {clientRevenue.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">{r.type} · {r.date}</span>
                      <span className={`font-medium ${r.status === "paid" ? "text-accent" : "text-warning"}`}>${r.amount?.toLocaleString()} {r.status === "paid" ? "✓" : "○"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-text-muted text-xs">No payments recorded</p>}
            </div>

            {/* Notes */}
            {selectedClient.notes && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold">Notes</h3>
                <p className="text-sm text-text-secondary bg-surface-2 rounded-lg p-3 whitespace-pre-line">{selectedClient.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {selectedSubData && <div className="fixed inset-0 bg-background/60 z-30" onClick={() => setSelectedSub(null)} />}
    </div>
  );
}
