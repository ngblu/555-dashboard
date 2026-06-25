"use client";

import { useState } from "react";
import { Crosshair, Plus, X, ArrowRightLeft, UserCheck, Rocket } from "lucide-react";
import { useStore, Lead } from "@/lib/useStore";

const statusFlow = ["found", "audited", "emailed", "replied", "converted"];

export default function LeadsPage() {
  const store = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ businessName: "", name: "", email: "", website: "", budget: "", message: "" });

  const addLead = () => {
    if (!form.businessName && !form.name) return;
    const lead: Lead = {
      id: "l" + Date.now(),
      businessName: form.businessName,
      name: form.name || form.businessName,
      email: form.email,
      website: form.website,
      budget: form.budget,
      message: form.message,
      status: "found",
      audit: null,
      createdAt: new Date().toISOString(),
    };
    store.addLeads([lead]);
    setForm({ businessName: "", name: "", email: "", website: "", budget: "", message: "" });
    setShowForm(false);
  };

  const advanceStatus = (lead: Lead) => {
    const idx = statusFlow.indexOf(lead.status);
    if (idx < statusFlow.length - 1) {
      store.updateItem("leads", lead.id, { status: statusFlow[idx + 1] });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-text-secondary text-sm mt-1">{store.leads.length} prospects tracked</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Business Name" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} />
            <input placeholder="Contact Name" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Email" type="email" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Website URL" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}>
              <option value="">Budget range</option>
              <option value="$500-1,000">$500 — $1,000</option>
              <option value="$1,000-2,500">$1,000 — $2,500</option>
              <option value="$2,500+">$2,500+</option>
            </select>
            <input placeholder="Notes" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={addLead} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium">Save Lead</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {store.leads.length === 0 && (
          <p className="text-text-muted text-center py-12">No leads yet. Add your first prospect or check back after a website form submission.</p>
        )}
        {store.leads.map(lead => (
          <div key={lead.id} className="bg-surface-2 border border-border rounded-xl p-4 group">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-text-primary">{lead.businessName || lead.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {lead.source === "website" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium uppercase tracking-wider">From Website</span>
                  )}
                  {lead.website && <span className="text-xs text-text-secondary">{lead.website}</span>}
                  {lead.email && <span className="text-xs text-text-secondary">{lead.email}</span>}
                </div>
              </div>
              <button onClick={() => store.removeItem("leads", lead.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(lead.budget || lead.message) && (
              <p className="text-sm text-text-secondary mb-3">
                {lead.budget && <span className="mr-3">Budget: {lead.budget}</span>}
                {lead.message}
              </p>
            )}

            {lead.audit && (
              <div className="flex gap-3 mb-3 text-xs text-text-muted">
                <span className={lead.audit.performance > 70 ? "text-accent" : "text-warning"}>⚡ Perf: {lead.audit.performance}/100</span>
                <span>🔍 SEO: {lead.audit.seo}/100</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {statusFlow.map(s => (
                  <button key={s} onClick={() => store.updateItem("leads", lead.id, { status: s })} className={`text-[11px] px-2 py-1 rounded-md font-medium capitalize transition-colors ${lead.status === s ? "bg-primary/20 text-primary" : "bg-surface text-text-muted hover:text-text-secondary"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => store.convertLeadToProject(lead)} className="flex items-center gap-1 text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20" title="Convert to Project">
                  <Rocket className="w-3 h-3" /> To Project
                </button>
                <button onClick={() => store.convertLeadToClient(lead)} className="flex items-center gap-1 text-xs px-2 py-1 bg-secondary/10 text-secondary rounded hover:bg-secondary/20" title="Convert to Client">
                  <UserCheck className="w-3 h-3" /> To Client
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
