"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crosshair,
  Plus,
  Globe,
  Mail,
  X,
  RefreshCw,
  Zap,
  UserPlus,
  FolderPlus,
  CheckCircle2,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";
import Link from "next/link";
import { FileSearch } from "lucide-react";

const statusFlow: LeadStatus[] = [
  "found",
  "audited",
  "emailed",
  "replied",
  "converted",
  "dead",
];

const statusColors: Record<LeadStatus, string> = {
  found: "bg-text-muted/20 text-text-secondary",
  audited: "bg-warning/20 text-warning",
  emailed: "bg-primary/20 text-primary",
  replied: "bg-secondary/20 text-secondary",
  converted: "bg-accent/20 text-accent",
  dead: "bg-danger/20 text-danger",
};

export default function LeadsPage() {
  const {
    leads,
    setLeads,
    convertLeadToClient,
    convertLeadToProject,
    hydrated,
  } = useData();

  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({
    businessName: "",
    website: "",
    industry: "",
    contactEmail: "",
    notes: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Poll for website submissions
  const fetchWebLeads = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/submit-lead");
      if (res.ok) {
        const data = await res.json();
        if (data.leads?.length > 0) {
          const webLeads: Lead[] = data.leads.map(
            (l: Record<string, unknown>) => ({
              id: l.id as string,
              businessName: (l.name as string) || "Unknown",
              website: (l.website as string) || "",
              industry: "",
              issues: [],
              status: "found" as LeadStatus,
              contactEmail: (l.email as string) || "",
              notes: `Budget: ${(l.budget as string) || "N/A"}\nMessage: ${
                (l.message as string) || ""
              }`,
              audit: l.audit as Lead["audit"],
              source: "website" as const,
              createdAt:
                (l.createdAt as string) || new Date().toISOString(),
            })
          );
          // Merge without duplicates
          setLeads((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = webLeads.filter((w) => !existingIds.has(w.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev];
          });
        }
      }
    } catch {
      // API not available, that's fine
    }
    setRefreshing(false);
  }, [setLeads]);

  useEffect(() => {
    if (!hydrated) return;
    fetchWebLeads();
    const interval = setInterval(fetchWebLeads, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchWebLeads, hydrated]);

  const addLead = () => {
    if (!newLead.businessName) return;
    setLeads((prev) => [
      {
        ...newLead,
        id: "l" + Date.now(),
        issues: [],
        status: "found",
        source: "manual",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewLead({
      businessName: "",
      website: "",
      industry: "",
      contactEmail: "",
      notes: "",
    });
    setShowAdd(false);
  };

  const cycleStatus = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const idx = statusFlow.indexOf(l.status);
        const next = statusFlow[(idx + 1) % statusFlow.length];
        return { ...l, status: next };
      })
    );
  };

  const removeLead = (id: string) =>
    setLeads((prev) => prev.filter((l) => l.id !== id));

  const handleConvertToClient = (lead: Lead) => {
    convertLeadToClient(lead.id, lead.audit ? 0 : 0);
    flash(`${lead.businessName} added to Clients ✓`);
  };

  const handleConvertToProject = (lead: Lead) => {
    convertLeadToProject(lead.id, {
      name: `${lead.businessName} Website`,
      tier: "full",
    });
    flash(`Client + Project created for ${lead.businessName} ✓`);
  };

  const inputCls =
    "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-accent/15 border border-accent/40 text-accent px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-slide-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-warning" /> Lead Pipeline
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {leads.length} prospects tracked
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchWebLeads}
            disabled={refreshing}
            className="bg-surface-2 border border-border text-text-secondary px-3 py-2 rounded-lg text-sm hover:border-primary hover:text-primary transition-all flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-slide-in">
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Business Name *"
              className={inputCls}
              value={newLead.businessName}
              onChange={(e) =>
                setNewLead({ ...newLead, businessName: e.target.value })
              }
            />
            <input
              placeholder="Website URL"
              className={inputCls}
              value={newLead.website}
              onChange={(e) =>
                setNewLead({ ...newLead, website: e.target.value })
              }
            />
            <input
              placeholder="Industry"
              className={inputCls}
              value={newLead.industry}
              onChange={(e) =>
                setNewLead({ ...newLead, industry: e.target.value })
              }
            />
            <input
              placeholder="Contact Email"
              className={inputCls}
              value={newLead.contactEmail}
              onChange={(e) =>
                setNewLead({ ...newLead, contactEmail: e.target.value })
              }
            />
          </div>
          <input
            placeholder="Notes"
            className={inputCls}
            value={newLead.notes}
            onChange={(e) =>
              setNewLead({ ...newLead, notes: e.target.value })
            }
          />
          <button
            onClick={addLead}
            className="bg-primary text-background px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all"
          >
            Save Lead
          </button>
        </div>
      )}

      {leads.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Crosshair className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-text-primary font-semibold mb-2">No leads yet</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Leads from your 555 Digital contact form will appear here
            automatically. You can also add leads manually.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="bg-surface border border-border rounded-xl p-5 hover:border-border-bright transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-text-primary font-semibold">
                    {lead.businessName}
                  </h3>
                  {lead.industry && (
                    <span className="text-text-muted text-xs bg-surface-2 px-2 py-0.5 rounded-full">
                      {lead.industry}
                    </span>
                  )}
                  <button
                    onClick={() => cycleStatus(lead.id)}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium cursor-pointer ${statusColors[lead.status]}`}
                  >
                    {lead.status}
                  </button>
                  {lead.source === "website" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Zap className="w-3 h-3" /> From website
                    </span>
                  )}
                  {lead.convertedClientId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Client
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-text-muted text-xs">
                  {lead.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {lead.website}
                    </span>
                  )}
                  {lead.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {lead.contactEmail}
                    </span>
                  )}
                </div>
                {lead.notes && (
                  <p className="text-text-secondary text-sm mt-2 whitespace-pre-line">
                    {lead.notes}
                  </p>
                )}
                {lead.audit && (
                  <div className="flex gap-4 mt-3 p-3 bg-surface-2 rounded-lg">
                    <div className="text-center">
                      <span
                        className={`text-lg font-bold ${
                          lead.audit.performance >= 90
                            ? "text-accent"
                            : lead.audit.performance >= 50
                            ? "text-warning"
                            : "text-danger"
                        }`}
                      >
                        {lead.audit.performance}
                      </span>
                      <p className="text-text-muted text-[10px]">Perf</p>
                    </div>
                    <div className="text-center">
                      <span
                        className={`text-lg font-bold ${
                          lead.audit.seo >= 90
                            ? "text-accent"
                            : lead.audit.seo >= 50
                            ? "text-warning"
                            : "text-danger"
                        }`}
                      >
                        {lead.audit.seo}
                      </span>
                      <p className="text-text-muted text-[10px]">SEO</p>
                    </div>
                    <div className="text-center">
                      <span className="text-text-primary text-sm font-mono">
                        {lead.audit.fcp}
                      </span>
                      <p className="text-text-muted text-[10px]">FCP</p>
                    </div>
                    <div className="text-center">
                      <span className="text-text-primary text-sm font-mono">
                        {lead.audit.lcp}
                      </span>
                      <p className="text-text-muted text-[10px]">LCP</p>
                    </div>
                  </div>
                )}
                {lead.issues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lead.issues.map((issue) => (
                      <span
                        key={issue}
                        className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                )}

                {/* Conversion actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/audit?leadId=${encodeURIComponent(
                      lead.id
                    )}&url=${encodeURIComponent(
                      lead.website || ""
                    )}&business=${encodeURIComponent(lead.businessName)}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-warning/30 text-warning bg-warning/5 hover:bg-warning/15 transition-all flex items-center gap-1.5"
                  >
                    <FileSearch className="w-3.5 h-3.5" /> Run Audit
                  </Link>
                  <button
                    onClick={() => handleConvertToClient(lead)}
                    disabled={!!lead.convertedClientId}
                    className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {lead.convertedClientId ? "Converted" : "Convert to Client"}
                  </button>
                  <button
                    onClick={() => handleConvertToProject(lead)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary bg-secondary/5 hover:bg-secondary/15 transition-all flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Spin up Project
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeLead(lead.id)}
                className="text-text-muted hover:text-danger p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
