"use client";

import { useState } from "react";
import { Crosshair, Plus, X, ArrowRight, UserCheck, Rocket, ChevronRight, Copy, Check } from "lucide-react";
import { useData } from "@/lib/store";
import type { LeadStatus } from "@/lib/types";
import GeneratePitchButton from "@/components/ui/GeneratePitch";

const statusFlow: LeadStatus[] = ["found", "audited", "emailed", "replied", "converted"];

const statusColors: Record<LeadStatus, string> = {
  found: "bg-text-muted/20 text-text-secondary border-text-muted/30",
  audited: "bg-primary/20 text-primary border-primary/30",
  emailed: "bg-warning/20 text-warning border-warning/30",
  replied: "bg-secondary/20 text-secondary border-secondary/30",
  converted: "bg-accent/20 text-accent border-accent/30",
  dead: "bg-danger/20 text-danger border-danger/30",
};

export default function LeadsPage() {
  const { leads, setLeads, convertLeadToClient, convertLeadToProject, addNotification } = useData();
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    website: "",
    industry: "",
    contactEmail: "",
    notes: "",
  });

  const addLead = () => {
    if (!form.businessName.trim()) return;
    const id = "l_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setLeads((prev) => [
      {
        id,
        businessName: form.businessName.trim(),
        website: form.website.trim(),
        industry: form.industry.trim(),
        issues: [],
        status: "found",
        contactEmail: form.contactEmail.trim(),
        notes: form.notes.trim(),
        audit: null,
        source: "manual",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    addNotification(`New lead: ${form.businessName.trim()}`, "success", "/leads");
    setForm({ businessName: "", website: "", industry: "", contactEmail: "", notes: "" });
    setShowForm(false);
  };

  const advanceStatus = (leadId: string, currentStatus: LeadStatus) => {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx < statusFlow.length - 1) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: statusFlow[idx + 1] } : l
        )
      );
    }
  };

  const handleConvertToClient = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    convertLeadToClient(leadId);
    addNotification(`Lead converted to client: ${lead?.businessName || "Unknown"}`, "success", "/clients");
  };

  const handleConvertToProject = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    convertLeadToProject(leadId);
    addNotification(`Project spun up for: ${lead?.businessName || "Unknown"}`, "success", "/projects");
  };

  const deleteLead = (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  };

  const copyReportLink = (leadId: string) => {
    const url = `${window.location.origin}/audit/report/${leadId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(leadId);
      addNotification("Report link copied to clipboard", "info");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(leadId);
      addNotification("Report link copied to clipboard", "info");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const inputCls =
    "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-primary" /> Lead Pipeline
          </h1>
          <p className="text-text-muted text-sm mt-1">{leads.length} prospects tracked</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3 animate-slide-in">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Business Name *"
              className={inputCls}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              autoFocus
            />
            <input
              placeholder="Website URL"
              className={inputCls}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <input
              placeholder="Industry"
              className={inputCls}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
            <input
              placeholder="Contact Email"
              type="email"
              className={inputCls}
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
            <input
              placeholder="Notes"
              className={`${inputCls} col-span-2`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={addLead}
              className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium"
            >
              Save Lead
            </button>
          </div>
        </div>
      )}

      {/* Leads list */}
      <div className="space-y-3">
        {leads.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <Crosshair className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">No leads yet</h3>
            <p className="text-text-muted text-sm max-w-md mx-auto mb-4">Add your first prospect or check back after a website form submission.</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>
        )}
        {leads.map((lead) => {
          const currentIdx = statusFlow.indexOf(lead.status);
          const canAdvance = currentIdx >= 0 && currentIdx < statusFlow.length - 1;
          return (
            <div
              key={lead.id}
              className="bg-surface border border-border rounded-xl p-4 group hover:border-border-bright transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-text-primary">{lead.businessName}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {lead.source === "website" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium uppercase tracking-wider">
                        From Website
                      </span>
                    )}
                    {lead.website && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          {lead.website}
                        </a>
                      </span>
                    )}
                    {lead.contactEmail && (
                      <span className="text-xs text-text-secondary">{lead.contactEmail}</span>
                    )}
                    {lead.industry && (
                      <span className="text-xs px-1.5 py-0.5 bg-surface-2 rounded text-text-muted">
                        {lead.industry}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteLead(lead.id)}
                  className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {lead.notes && (
                <p className="text-sm text-text-secondary mb-3 whitespace-pre-line">
                  {lead.notes}
                </p>
              )}

              {lead.audit && (
                <div className="flex gap-3 mb-3 text-xs text-text-muted bg-surface-2 rounded-lg p-2 items-center flex-wrap">
                  <span className={lead.audit.performance > 70 ? "text-accent" : "text-warning"}>
                    ⚡ Perf: {lead.audit.performance}/100
                  </span>
                  <span>🔍 SEO: {lead.audit.seo}/100</span>
                  <span>♿ A11y: {lead.audit.accessibility}/100</span>
                  <button
                    onClick={() => copyReportLink(lead.id)}
                    className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors"
                    title="Copy audit report link"
                  >
                    {copiedId === lead.id ? (
                      <><Check className="w-3 h-3" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy Report</>
                    )}
                  </button>
                </div>
              )}

              {/* Status pipeline */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {statusFlow.map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setLeads((prev) =>
                            prev.map((l) => (l.id === lead.id ? { ...l, status: s } : l))
                          )
                        }
                        className={`text-[11px] px-2 py-1 rounded-md font-medium capitalize transition-colors border ${
                          lead.status === s
                            ? statusColors[s]
                            : "bg-surface-2 text-text-muted border-transparent hover:text-text-secondary hover:border-border"
                        }`}
                      >
                        {s}
                      </button>
                      {i < statusFlow.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-text-muted" />
                      )}
                    </span>
                  ))}
                  {canAdvance && (
                    <button
                      onClick={() => advanceStatus(lead.id, lead.status)}
                      className="ml-2 text-[10px] px-1.5 py-1 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1"
                      title={`Advance to ${statusFlow[currentIdx + 1]}`}
                    >
                      <ArrowRight className="w-3 h-3" /> Advance
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {lead.status !== "converted" && (
                    <>
                      <button
                        onClick={() => handleConvertToProject(lead.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20"
                        title="Convert to Project"
                      >
                        <Rocket className="w-3 h-3" /> To Project
                      </button>
                      <button
                        onClick={() => handleConvertToClient(lead.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-secondary/10 text-secondary rounded hover:bg-secondary/20"
                        title="Convert to Client"
                      >
                        <UserCheck className="w-3 h-3" /> To Client
                      </button>
                    </>
                  )}
                  {lead.status === "converted" && (
                    <span className="text-xs text-accent font-medium">✓ Converted</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                  <GeneratePitchButton
                    lead={{
                      businessName: lead.businessName,
                      website: lead.website,
                      contactName: lead.contactEmail || undefined,
                      contactEmail: lead.contactEmail || undefined,
                      auditScores: lead.audit ? { performance: lead.audit.performance, seo: lead.audit.seo, accessibility: lead.audit.accessibility } : null,
                      issues: lead.issues || [],
                      industry: lead.industry || undefined,
                    }}
                  />
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
