"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Phone,
  Globe,
  MapPin,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  UserCheck,
  MessageSquare,
  FileText,
  Handshake,
  TrendingUp,
  BarChart3,
  Clock,
  LogOut,
  ExternalLink,
  Plus,
  Search,
  Gauge,
  Loader2,
  Zap,
  ChevronUp,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { SalesStage, Lead } from "@/lib/types";

const STAGES: { key: SalesStage; label: string; icon: React.ElementType; color: string }[] = [
  { key: "new", label: "New", icon: Plus, color: "bg-text-muted/20 text-text-secondary border-text-muted/30" },
  { key: "contacted", label: "Contacted", icon: Phone, color: "bg-primary/20 text-primary border-primary/30" },
  { key: "qualified", label: "Qualified", icon: UserCheck, color: "bg-secondary/20 text-secondary border-secondary/30" },
  { key: "proposal", label: "Proposal", icon: FileText, color: "bg-warning/20 text-warning border-warning/30" },
  { key: "negotiation", label: "Negotiation", icon: Handshake, color: "bg-warning/20 text-warning border-warning/30" },
  { key: "closed_won", label: "Closed Won", icon: CheckCircle2, color: "bg-accent/20 text-accent border-accent/30" },
  { key: "closed_lost", label: "Closed Lost", icon: XCircle, color: "bg-danger/20 text-danger border-danger/30" },
];

function stageColor(stage: SalesStage): string {
  return STAGES.find((s) => s.key === stage)?.color || STAGES[0].color;
}

function stageLabel(stage: SalesStage): string {
  return STAGES.find((s) => s.key === stage)?.label || stage;
}

export default function SalesDashboard() {
  const router = useRouter();
  const { user, loadingUser, setUser, leads, updateLeadStage, addNotification } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<SalesStage | "all">("all");
  const [mounted, setMounted] = useState(false);

  // ---- audit / lead-gen ----
  const [showAuditor, setShowAuditor] = useState(false);
  const [auditUrl, setAuditUrl] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    lead: Lead;
    scores: { performance: number; seo: number; accessibility: number; bestPractices: number };
  } | null>(null);
  const [auditError, setAuditError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Redirect if not logged in or not a salesman
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push("/login");
    }
  }, [user, loadingUser, router]);

  if (!mounted || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Filter leads based on role
  let myLeads: typeof leads;
  if (user.role === "manager" || user.role === "admin") {
    // Managers and admins see all leads in pipeline
    myLeads = leads.filter((l) => l.salesStage);
  } else {
    // Salesmen only see leads assigned to them or in their area
    myLeads = leads.filter((l) => {
      const isAssigned = l.assignedTo === user.sub;
      const isInArea = user.area && l.area === user.area && !l.assignedTo;
      const inPipeline = l.salesStage && l.salesStage !== "closed_lost";
      return isAssigned || (isInArea && inPipeline) || (isAssigned && l.salesStage === "closed_lost");
    });
  }

  const displayLeads = myLeads;

  const filteredLeads = filterStage === "all"
    ? displayLeads
    : displayLeads.filter((l) => l.salesStage === filterStage);

  // Stats
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.key] = displayLeads.filter((l) => l.salesStage === s.key).length;
    return acc;
  }, {} as Record<SalesStage, number>);

  const closedWon = stageCounts.closed_won || 0;
  const totalPipeline = displayLeads.filter(
    (l) => l.salesStage && l.salesStage !== "closed_lost" && l.salesStage !== "closed_won"
  ).length;
  const conversionRate = displayLeads.length > 0
    ? Math.round((closedWon / displayLeads.filter((l) => l.salesStage === "closed_won" || l.salesStage === "closed_lost").length) * 100) || 0
    : 0;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    const url = auditUrl.trim();
    if (!url) return;

    setAuditError("");
    setAuditResult(null);
    setAuditing(true);

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: url,
          area: user?.area || "",
          source: "manual",
          notes: `Manually audited by ${user?.name || "salesman"}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.lead) {
        setAuditError(data.error || "Audit failed");
        setAuditing(false);
        return;
      }

      const lead = data.lead as Lead;
      setAuditResult({
        lead,
        scores: {
          performance: lead.audit?.performance ?? 0,
          seo: lead.audit?.seo ?? 0,
          accessibility: lead.audit?.accessibility ?? 0,
          bestPractices: lead.audit?.bestPractices ?? 0,
        },
      });

      addNotification(`Audit complete: ${lead.businessName || url}`, "success", "/sales");
    } catch {
      setAuditError("Network error, try again");
    } finally {
      setAuditing(false);
    }
  }

  function handleStageChange(leadId: string, newStage: SalesStage) {
    updateLeadStage(leadId, newStage);
    addNotification(
      `Lead moved to ${stageLabel(newStage)}`,
      newStage === "closed_won" ? "success" : "info",
      "/sales"
    );
  }

  function getNextStages(current: SalesStage | undefined): SalesStage[] {
    if (!current || current === "closed_won" || current === "closed_lost") return [];
    const idx = STAGES.findIndex((s) => s.key === current);
    if (idx === -1) return ["contacted"];
    // Show next 2 stages plus closed options
    const next: SalesStage[] = [];
    if (idx + 1 < STAGES.length) next.push(STAGES[idx + 1].key);
    if (idx + 2 < STAGES.length) next.push(STAGES[idx + 2].key);
    if (!next.includes("closed_won")) next.push("closed_won");
    if (!next.includes("closed_lost")) next.push("closed_lost");
    return next;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Pipeline</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {user.name} · {user.area || "All Areas"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {user.role}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Audit / Lead Gen Panel */}
      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowAuditor(!showAuditor);
            if (showAuditor) { setAuditResult(null); setAuditError(""); }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-2/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-medium text-sm text-text-primary">Audit & Generate Leads</span>
              <p className="text-xs text-text-muted">Run PageSpeed audits on websites in your area</p>
            </div>
          </div>
          {showAuditor ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-muted" />
          )}
        </button>

        {showAuditor && (
          <div className="border-t border-border px-4 py-4 space-y-4">
            <form onSubmit={runAudit} className="flex gap-2">
              <input
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="Enter website URL to audit..."
                required
                className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={auditing || !auditUrl.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors shrink-0"
              >
                {auditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auditing...
                  </>
                ) : (
                  <>
                    <Gauge className="w-4 h-4" />
                    Run Audit
                  </>
                )}
              </button>
            </form>

            {auditError && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-3 py-2">
                {auditError}
              </div>
            )}

            {auditResult && (
              <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="font-medium text-sm text-text-primary">
                    {auditResult.lead.businessName || auditResult.lead.website}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                    Lead Created
                  </span>
                </div>

                {/* Score gauges */}
                <div className="grid grid-cols-4 gap-2">
                  {(["performance", "accessibility", "bestPractices", "seo"] as const).map((key) => {
                    const score = auditResult.scores[key];
                    const color =
                      score >= 90 ? "text-accent" : score >= 50 ? "text-warning" : "text-danger";
                    const ring =
                      score >= 90
                        ? "border-accent/40"
                        : score >= 50
                          ? "border-warning/40"
                          : "border-danger/40";
                    return (
                      <div key={key} className="text-center">
                        <div
                          className={`w-12 h-12 mx-auto rounded-full border-2 ${ring} bg-surface-1 flex items-center justify-center`}
                        >
                          <span className={`text-sm font-bold ${color}`}>{score}</span>
                        </div>
                        <span className="text-[10px] text-text-muted mt-1 block capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-text-muted">
                  {auditResult.scores.performance < 50
                    ? "🚨 Terrible performance — perfect prospect. They're losing visitors before the page loads."
                    : auditResult.scores.performance < 70
                      ? "⚠️ Below average — good pitch opportunity."
                      : "✅ Decent scores — may need less convincing."}
                </p>

                <button
                  onClick={() => {
                    setAuditResult(null);
                    setAuditUrl("");
                    setAuditError("");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Audit another site →
                </button>
              </div>
            )}

            <p className="text-[11px] text-text-muted">
              Enter any website URL. We'll run a full PageSpeed audit, score it, and save it as a
              lead in {user?.area || "your area"}.
            </p>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Pipeline
          </div>
          <span className="text-2xl font-bold text-text-primary">{totalPipeline}</span>
        </div>
        <div className="bg-surface-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Closed Won
          </div>
          <span className="text-2xl font-bold text-accent">{closedWon}</span>
        </div>
        <div className="bg-surface-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Conversion
          </div>
          <span className="text-2xl font-bold text-text-primary">{conversionRate}%</span>
        </div>
        <div className="bg-surface-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Crosshair className="w-3.5 h-3.5" />
            Total Leads
          </div>
          <span className="text-2xl font-bold text-text-primary">{displayLeads.length}</span>
        </div>
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterStage("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filterStage === "all"
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-surface-2 text-text-muted border-border hover:border-text-muted/30"
          }`}
        >
          All ({displayLeads.length})
        </button>
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStage(s.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterStage === s.key ? s.color : "bg-surface-2 text-text-muted border-border hover:border-text-muted/30"
            }`}
          >
            {s.label} ({stageCounts[s.key] || 0})
          </button>
        ))}
      </div>

      {/* Leads list */}
      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-xl p-8 text-center">
            <Crosshair className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No leads in this stage</p>
            <p className="text-text-muted text-xs mt-1">
              {user.area
                ? `Leads in ${user.area} will appear here when assigned`
                : "Leads will appear here when assigned to you"}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const expanded = expandedId === lead.id;
            const currentStage = lead.salesStage || "new";
            const nextStages = getNextStages(currentStage);

            return (
              <div
                key={lead.id}
                className="bg-surface-1 border border-border rounded-xl overflow-hidden transition-all"
              >
                {/* Lead row */}
                <button
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-surface-2/50 transition-colors text-left"
                >
                  <div className={`shrink-0 w-2 h-2 rounded-full ${
                    lead.classification === "hot" ? "bg-danger" :
                    lead.classification === "warm" ? "bg-warning" : "bg-text-muted"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm truncate">
                        {lead.businessName}
                      </span>
                      {lead.score !== undefined && (
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          lead.score >= 70 ? "bg-danger/15 text-danger" :
                          lead.score >= 40 ? "bg-warning/15 text-warning" : "bg-text-muted/15 text-text-muted"
                        }`}>
                          {lead.score}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      {lead.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </span>
                      )}
                      {lead.area && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {lead.area}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-1 rounded-full border ${stageColor(currentStage)}`}>
                    {stageLabel(currentStage)}
                  </span>
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-surface-2/30">
                    {/* Contact info */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" /> {lead.phone}
                        </a>
                      )}
                      {lead.contactEmail && (
                        <a
                          href={`mailto:${lead.contactEmail}`}
                          className="flex items-center gap-1.5 text-secondary hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> {lead.contactEmail}
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-text-secondary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Visit Site
                        </a>
                      )}
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                      <p className="text-xs text-text-muted bg-surface-1/50 rounded-lg p-2 border border-border/50">
                        {lead.notes}
                      </p>
                    )}

                    {/* Audit scores if available */}
                    {lead.audit && (
                      <div className="grid grid-cols-4 gap-2">
                        {(["performance", "accessibility", "bestPractices", "seo"] as const).map((key) => (
                          <div key={key} className="text-center bg-surface-1 rounded-lg p-2 border border-border/50">
                            <div className={`text-lg font-bold ${
                              lead.audit![key] >= 90 ? "text-accent" :
                              lead.audit![key] >= 50 ? "text-warning" : "text-danger"
                            }`}>
                              {lead.audit![key]}
                            </div>
                            <div className="text-[10px] text-text-muted capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stage actions */}
                    {nextStages.length > 0 && (
                      <div>
                        <p className="text-xs text-text-muted mb-2">Move to:</p>
                        <div className="flex flex-wrap gap-2">
                          {nextStages.map((stage) => {
                            const s = STAGES.find((st) => st.key === stage)!;
                            return (
                              <button
                                key={stage}
                                onClick={() => handleStageChange(lead.id, stage)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 ${s.color}`}
                              >
                                <s.icon className="w-3 h-3" />
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage timeline */}
                    {lead.stageUpdatedAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Clock className="w-3 h-3" />
                        Last updated: {new Date(lead.stageUpdatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
