"use client";

import { useState, useEffect, useRef } from "react";
import {
  Crosshair, Plus, X, ArrowRight, UserCheck, Rocket, ChevronRight,
  Copy, Check, ChevronDown, ExternalLink, Phone, Globe, BarChart3,
  Search, Gauge, Eye, Shield, Zap, Clock, Timer, Smartphone,
  Play, RefreshCw,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { LeadStatus, AuditMetrics } from "@/lib/types";
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

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 999 : n;
}

function ScoreDot({ score, label, icon: Icon }: { score: number; label: string; icon: React.ElementType }) {
  const color =
    score >= 90 ? "text-accent" : score >= 50 ? "text-warning" : "text-danger";
  const ring =
    score >= 90
      ? "border-accent/40"
      : score >= 50
        ? "border-warning/40"
        : "border-danger/40";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${ring} bg-surface-2 flex items-center justify-center`}>
        <span className={`text-xs sm:text-sm font-bold ${color}`}>{score}</span>
      </div>
      <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${color}`} />
      <span className="text-[9px] sm:text-[10px] text-text-muted text-center leading-tight">{label}</span>
    </div>
  );
}

function VitalsRow({ label, value, good, icon: Icon }: { label: string; value: string; good: boolean; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${good ? "text-accent" : "text-warning"}`} />
      <span className="text-xs text-text-secondary flex-1 truncate">{label}</span>
      <span className={`text-xs font-mono font-medium shrink-0 ${good ? "text-accent" : "text-warning"}`}>{value}</span>
    </div>
  );
}

function sourceBadge(source: string | undefined) {
  switch (source) {
    case "page2_audit":
      return { label: "Page 2 Audit", color: "bg-accent/15 text-accent border-accent/30", icon: Search };
    case "automated":
      return { label: "Auto-Discovered", color: "bg-secondary/15 text-secondary border-secondary/30", icon: Zap };
    case "website":
      return { label: "From Website", color: "bg-primary/15 text-primary border-primary/30", icon: Globe };
    default:
      return { label: "Manual", color: "bg-surface-2 text-text-secondary border-border", icon: Plus };
  }
}

export default function LeadsPage() {
  const { leads, setLeads, convertLeadToClient, convertLeadToProject, addNotification, addNotifications } = useData();
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningFinder, setRunningFinder] = useState(false);
  const [finderStatus, setFinderStatus] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    website: "",
    industry: "",
    contactEmail: "",
    phone: "",
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
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        audit: null,
        source: "manual",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    addNotification(`New lead: ${form.businessName.trim()}`, "success", "/leads");
    setForm({ businessName: "", website: "", industry: "", contactEmail: "", phone: "", notes: "" });
    setShowForm(false);
  };

  // Load server-side leads on mount (local + Vercel relay)
  useEffect(() => {
    // Local leads
    fetch("/api/submit-lead")
      .then((r) => r.json())
      .then((data) => {
        if (data.leads && data.leads.length > 0) {
          mergeServerLeads(data.leads);
        }
      })
      .catch(() => {});
    // Vercel relay leads (for phone sync)
    fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "get_leads" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.leads && data.leads.length > 0) {
          mergeServerLeads(data.leads);
        }
      })
      .catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function mergeServerLeads(serverLeadsRaw: Record<string, unknown>[]) {
    const serverLeads = serverLeadsRaw.map((l) => ({
      id: String(l.id || ""),
      businessName: String(l.businessName || l.name || ""),
      website: String(l.website || ""),
      industry: String(l.industry || ""),
      contactEmail: String(l.contactEmail || l.email || ""),
      phone: String(l.phone || ""),
      notes: String(l.notes || l.message || ""),
      source: String(l.source || "page2_audit"),
      status: (l.status as LeadStatus) || "found",
      audit: (l.audit as AuditMetrics | null) || null,
      issues: [],
      createdAt: String(l.createdAt || new Date().toISOString()),
    }));
    setLeads((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newOnes = serverLeads.filter((sl) => !existingIds.has(sl.id));
      return [...newOnes, ...prev];
    });
  }

  const runLeadFinder = async () => {
    setRunningFinder(true);
    setFinderStatus("Starting Lead Finder...");
    addNotification("Lead Finder scanning page 2 Google results...", "info");
    
    // Clear any existing poll
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await fetch("http://localhost:5555/api/lead-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 555-remote-bridge" },
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();

      if (data.status === "started" || data.status === "already_running") {
        setFinderStatus("Scanning... checking for new leads every 5s");
        
        // Poll for status and new leads from server
        pollRef.current = setInterval(async () => {
          try {
            // Check if finder is still running
            const sRes = await fetch("http://localhost:5555/api/lead-finder/status");
            const sData = await sRes.json();
            if (!sData.running) {
              setFinderStatus(sData.output.includes("LEAD:") ? "Complete! New leads found." : "Done. See results below.");
              setRunningFinder(false);
              if (pollRef.current) clearInterval(pollRef.current);
            }
          } catch {}

          // Fetch new leads from server API
          try {
            const lRes = await fetch("/api/submit-lead");
            const lData = await lRes.json();
            if (lData.leads && lData.leads.length > 0) {
              // Merge server leads into local store (dedupe by id)
              const serverLeads = lData.leads.map((l: Record<string, unknown>) => ({
                id: String(l.id || ""),
                businessName: String(l.businessName || l.name || ""),
                website: String(l.website || ""),
                industry: String(l.industry || ""),
                contactEmail: String(l.contactEmail || l.email || ""),
                phone: String(l.phone || ""),
                notes: String(l.notes || l.message || ""),
                source: String(l.source || "page2_audit"),
                status: (l.status as LeadStatus) || "found",
                audit: (l.audit as AuditMetrics | null) || null,
                issues: [],
                createdAt: String(l.createdAt || new Date().toISOString()),
              }));
              setLeads((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const newOnes = serverLeads.filter((sl: {id: string}) => !existingIds.has(sl.id));
                if (newOnes.length > 0) {
                  addNotifications(newOnes.map((nl: {businessName: string}) => 
                    ({ message: `New lead found: ${nl.businessName}`, type: "success" as const, link: "/leads" })
                  ));
                }
                return [...newOnes, ...prev];
              });
            }
          } catch {}
        }, 5000);

        setTimeout(() => {
          // Safety: stop polling after 5 minutes
          if (pollRef.current) {
            clearInterval(pollRef.current);
            setRunningFinder(false);
            setFinderStatus("Timed out. Check results below.");
          }
        }, 300000);

      } else if (data.status === "already_running") {
        setFinderStatus("Lead Finder is already running...");
      } else {
        setFinderStatus("Started (status: " + (data.status || "unknown") + ")");
        setRunningFinder(false);
      }
    } catch {
      // Fallback: try relay
      setFinderStatus("Bridge unavailable. Trying cloud relay...");
      try {
        const res = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer 555-remote-bridge" },
          body: JSON.stringify({ op: "send", action: "run_lead_finder" }),
        });
        const data = await res.json();
        if (data.ok) {
          setFinderStatus("Queued via cloud relay. Check back soon.");
          addNotification("Lead Finder queued via relay. Results will appear when bridge processes them.", "info");
        } else {
          setFinderStatus("Could not reach bridge. Is it running?");
          addNotification("Could not reach bridge. Is it running?", "error");
        }
      } catch {
        setFinderStatus("Could not reach bridge. Start the bridge on your desktop first.");
        addNotification("Could not reach bridge. Start the bridge on your desktop first.", "error");
      }
      setRunningFinder(false);
    }
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
    addNotification(`Converted: ${lead?.businessName || "Unknown"}`, "success", "/clients");
  };

  const handleConvertToProject = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    convertLeadToProject(leadId);
    addNotification(`Project spun up for: ${lead?.businessName || "Unknown"}`, "success", "/projects");
  };

  const deleteLead = (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (expandedId === leadId) setExpandedId(null);
  };

  const copyReportLink = (leadId: string) => {
    const url = `${window.location.origin}/audit/report/${leadId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(leadId);
      addNotification("Report link copied", "info");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(leadId);
      addNotification("Report link copied", "info");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const parseRankingFromNotes = (notes: string): string | null => {
    if (notes.includes("PAGE 2 GOOGLE")) return "Page 2 Google";
    if (notes.includes("page 2")) return "Page 2";
    if (notes.includes("Page 2")) return "Page 2 Google";
    if (notes.includes("PAGE 2")) return "Page 2 Google";
    return null;
  };

  const inputCls =
    "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Lead Pipeline
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5 sm:mt-1">{leads.length} prospects tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runLeadFinder}
            disabled={runningFinder}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent border border-accent/30 rounded-lg text-xs sm:text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50"
            title="Run automated lead discovery"
          >
            {runningFinder ? (
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span className="hidden sm:inline">Run Lead Finder</span>
            <span className="sm:hidden">Find</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-background rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add Lead
          </button>
        </div>
      </div>
      {finderStatus && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${
          runningFinder ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-text-secondary"
        }`}>
          {runningFinder && <RefreshCw className="w-3 h-3 inline mr-1.5 animate-spin" />}
          {finderStatus}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 space-y-3 animate-slide-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
              placeholder="Phone"
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              className={inputCls}
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
      <div className="space-y-2 sm:space-y-3">
        {leads.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-8 sm:p-12 text-center">
            <Crosshair className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted mx-auto mb-3 sm:mb-4" />
            <h3 className="text-text-primary font-semibold mb-2 text-sm sm:text-base">No leads yet</h3>
            <p className="text-text-muted text-xs sm:text-sm max-w-md mx-auto mb-4">
              Add your first prospect or click <strong>Run Lead Finder</strong> to automatically discover leads from page 2 of Google.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> Add Lead
              </button>
              <button onClick={runLeadFinder} disabled={runningFinder} className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/25 transition-colors disabled:opacity-50">
                {runningFinder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Lead Finder
              </button>
            </div>
          </div>
        )}

        {leads.map((lead) => {
          const isExpanded = expandedId === lead.id;
          const currentIdx = statusFlow.indexOf(lead.status);
          const canAdvance = currentIdx >= 0 && currentIdx < statusFlow.length - 1;
          const ranking = parseRankingFromNotes(lead.notes || "");
          const audit = lead.audit as AuditMetrics | null | undefined;
          const src = sourceBadge(lead.source);
          const SrcIcon = src.icon;

          return (
            <div
              key={lead.id}
              className={`bg-surface border rounded-xl transition-all duration-200 ${
                isExpanded ? "border-primary/40 shadow-[0_0_20px_rgba(0,212,255,0.05)]" : "border-border hover:border-border-bright"
              }`}
            >
              {/* Collapsed header */}
              <button
                onClick={() => toggleExpand(lead.id)}
                className="w-full text-left p-3 sm:p-4 flex items-start gap-2 sm:gap-3 min-h-[44px]"
              >
                <div className={`mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="font-semibold text-text-primary text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">{lead.businessName}</h3>
                    {/* Compact badges on mobile */}
                    <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded font-medium uppercase tracking-wider border ${src.color} flex items-center gap-0.5 sm:gap-1`}>
                      <SrcIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                      <span className="hidden sm:inline">{src.label}</span>
                    </span>
                    {ranking && (
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-accent/15 text-accent rounded font-medium uppercase tracking-wider hidden sm:flex items-center gap-1">
                        <Search className="w-2.5 h-2.5" /> {ranking}
                      </span>
                    )}
                    {lead.industry && (
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-surface-2 rounded text-text-muted">
                        {lead.industry}
                      </span>
                    )}
                  </div>
                  {/* Second row: compact on mobile */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs text-text-secondary flex-wrap">
                    {lead.website && (
                      <a
                        href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="hidden sm:inline">{lead.website.length > 30 ? lead.website.slice(0, 30) + "..." : lead.website}</span>
                        <span className="sm:hidden">{lead.website.replace(/https?:\/\//, "").replace("www.", "").split("/")[0].slice(0, 18)}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="hidden sm:inline">{lead.phone}</span>
                      </span>
                    )}
                    {lead.contactEmail && !lead.phone && (
                      <span className="hidden sm:inline truncate max-w-[120px]">{lead.contactEmail}</span>
                    )}
                    {audit && (
                      <span className="flex items-center gap-1 text-accent font-medium shrink-0">
                        <BarChart3 className="w-3 h-3" />
                        <span className="text-[10px] sm:text-xs">{audit.performance}/{audit.seo}</span>
                      </span>
                    )}
                    {/* Mobile-only ranking indicator */}
                    {ranking && (
                      <span className="flex sm:hidden items-center gap-0.5 text-[9px] text-accent font-medium">
                        <Search className="w-2.5 h-2.5" /> {ranking}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                  className="text-text-muted hover:text-danger shrink-0 p-1 -mr-1"
                  aria-label="Delete lead"
                >
                  <X className="w-4 h-4" />
                </button>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-4 border-t border-border animate-slide-in">
                  {/* Mobile: stacked single column; Desktop: 3-column grid */}
                  <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                    {/* Audit scores — full width on mobile, 2 cols on desktop */}
                    <div className="lg:col-span-2 space-y-3 sm:space-y-4 order-1">
                      {audit ? (
                        <>
                          <div>
                            <h4 className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                              <Gauge className="w-3.5 h-3.5" /> Audit Scores
                            </h4>
                            <div className="flex items-center justify-around bg-surface-2 rounded-lg p-3 sm:p-4">
                              <ScoreDot score={audit.performance} label="Perf" icon={Zap} />
                              <ScoreDot score={audit.seo} label="SEO" icon={Search} />
                              <ScoreDot score={audit.accessibility} label="A11y" icon={Eye} />
                              <ScoreDot score={audit.bestPractices} label="Best" icon={Shield} />
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Timer className="w-3.5 h-3.5" /> Core Web Vitals
                            </h4>
                            <div className="bg-surface-2 rounded-lg p-2 sm:p-3 space-y-0">
                              <VitalsRow label="First Contentful Paint" value={audit.fcp} good={parseNum(audit.fcp) < 2} icon={Clock} />
                              <VitalsRow label="Largest Contentful Paint" value={audit.lcp} good={parseNum(audit.lcp) < 2.5} icon={Clock} />
                              <VitalsRow label="Cumulative Layout Shift" value={audit.cls} good={parseNum(audit.cls) < 0.1} icon={Clock} />
                              <VitalsRow label="Total Blocking Time" value={audit.tbt} good={parseNum(audit.tbt) < 300} icon={Timer} />
                              <VitalsRow label="Speed Index" value={audit.speedIndex} good={parseNum(audit.speedIndex) < 4} icon={Gauge} />
                              <VitalsRow label="Time to First Byte" value={audit.ttfb} good={parseNum(audit.ttfb) < 800} icon={Zap} />
                              <VitalsRow label="Mobile Friendly" value={audit.mobileFriendly ? "Yes" : "No"} good={audit.mobileFriendly} icon={Smartphone} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-surface-2 rounded-lg p-4 text-center text-text-muted text-sm">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No audit data yet.{" "}
                          <a href={`/audit?url=${encodeURIComponent(lead.website || "")}&business=${encodeURIComponent(lead.businessName)}&leadId=${lead.id}`} className="text-primary hover:underline">
                            Run an audit
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Contact & Info sidebar */}
                    <div className="space-y-2 sm:space-y-3 order-2">
                      {/* Contact card */}
                      <div className="bg-surface-2 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        <h4 className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</h4>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-xs sm:text-sm text-text-primary hover:text-primary py-1">
                            <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" /> {lead.phone}
                          </a>
                        )}
                        {lead.contactEmail && (
                          <a href={`mailto:${lead.contactEmail}`} className="flex items-center gap-2 text-xs sm:text-sm text-text-primary hover:text-primary break-all py-1">
                            {lead.contactEmail}
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs sm:text-sm text-text-primary hover:text-primary py-1"
                          >
                            <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" /> Visit Website
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                        {!lead.phone && !lead.contactEmail && !lead.website && (
                          <p className="text-[11px] text-text-muted">No contact info available</p>
                        )}
                      </div>

                      {/* Details card */}
                      <div className="bg-surface-2 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        <h4 className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">Details</h4>
                        <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
                          {lead.industry && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">Industry</span>
                              <span className="text-text-primary font-medium">{lead.industry}</span>
                            </div>
                          )}
                          {ranking && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">Google Rank</span>
                              <span className="text-accent font-medium">{ranking}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-text-muted">Source</span>
                            <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded border ${src.color}`}>{src.label}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Status</span>
                            <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border capitalize ${statusColors[lead.status]}`}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Found</span>
                            <span className="text-text-primary">
                              {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          {lead.audit && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">Audited</span>
                              <span className="text-text-primary">
                                {new Date(lead.audit.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {lead.notes && (
                        <div className="bg-surface-2 rounded-lg p-2 sm:p-3">
                          <h4 className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes</h4>
                          <p className="text-[11px] sm:text-xs text-text-secondary whitespace-pre-line">{lead.notes}</p>
                        </div>
                      )}

                      {/* Issues */}
                      {lead.audit?.issues && lead.audit.issues.length > 0 && (
                        <div className="bg-danger/5 border border-danger/20 rounded-lg p-2 sm:p-3">
                          <h4 className="text-[10px] sm:text-xs font-semibold text-danger uppercase tracking-wider mb-1">
                            Issues ({lead.audit.issues.length})
                          </h4>
                          <ul className="space-y-1">
                            {lead.audit.issues.slice(0, 5).map((issue, i) => (
                              <li key={i} className="text-[10px] sm:text-[11px] text-text-secondary flex items-start gap-1.5">
                                <span className="text-danger mt-0.5 shrink-0">•</span> {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
                    {/* Status pipeline — scrollable on mobile */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
                      {statusFlow.map((s, i) => (
                        <span key={s} className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              setLeads((prev) =>
                                prev.map((l) => (l.id === lead.id ? { ...l, status: s } : l))
                              )
                            }
                            className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded-md font-medium capitalize transition-colors border whitespace-nowrap ${
                              lead.status === s
                                ? statusColors[s]
                                : "bg-surface-2 text-text-muted border-transparent hover:text-text-secondary hover:border-border"
                            }`}
                          >
                            {s}
                          </button>
                          {i < statusFlow.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                          )}
                        </span>
                      ))}
                      {canAdvance && (
                        <button
                          onClick={() => advanceStatus(lead.id, lead.status)}
                          className="ml-1 text-[9px] sm:text-[10px] px-1.5 py-1 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap"
                        >
                          <ArrowRight className="w-3 h-3" /> Advance
                        </button>
                      )}
                    </div>

                    {/* Convert + Pitch — wrap on mobile */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {audit && (
                        <button
                          onClick={() => copyReportLink(lead.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1.5 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors min-h-[36px]"
                        >
                          {copiedId === lead.id ? (
                            <><Check className="w-3 h-3" /> Copied!</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy Report</>
                          )}
                        </button>
                      )}
                      <GeneratePitchButton
                        lead={{
                          businessName: lead.businessName,
                          website: lead.website,
                          contactName: lead.contactEmail || undefined,
                          contactEmail: lead.contactEmail || undefined,
                          auditScores: audit ? { performance: audit.performance, seo: audit.seo, accessibility: audit.accessibility } : null,
                          issues: lead.issues || [],
                          industry: lead.industry || undefined,
                        }}
                      />
                      {lead.status !== "converted" && (
                        <>
                          <button
                            onClick={() => handleConvertToProject(lead.id)}
                            className="flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1.5 bg-accent/10 text-accent rounded hover:bg-accent/20 min-h-[36px] whitespace-nowrap"
                          >
                            <Rocket className="w-3 h-3" /> To Project
                          </button>
                          <button
                            onClick={() => handleConvertToClient(lead.id)}
                            className="flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1.5 bg-secondary/10 text-secondary rounded hover:bg-secondary/20 min-h-[36px] whitespace-nowrap"
                          >
                            <UserCheck className="w-3 h-3" /> To Client
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
