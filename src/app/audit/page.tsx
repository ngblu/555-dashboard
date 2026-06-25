"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileSearch,
  Globe,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone,
  Monitor,
  Download,
  UserPlus,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { AuditMetrics, SavedAudit } from "@/lib/types";

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 999 : n;
}

type AuditResult = AuditMetrics;

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90
      ? "text-accent"
      : score >= 50
      ? "text-warning"
      : "text-danger";
  const bg =
    score >= 90
      ? "bg-accent/10 border-accent/30"
      : score >= 50
      ? "bg-warning/10 border-warning/30"
      : "bg-danger/10 border-danger/30";

  return (
    <div className="text-center">
      <div
        className={`w-20 h-20 rounded-full border-2 ${bg} flex items-center justify-center mx-auto mb-2`}
      >
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <p className="text-text-secondary text-xs">{label}</p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-text-primary text-sm font-mono">{value}</span>
        {good ? (
          <CheckCircle className="w-4 h-4 text-accent" />
        ) : (
          <XCircle className="w-4 h-4 text-danger" />
        )}
      </div>
    </div>
  );
}

function AuditPageInner() {
  const searchParams = useSearchParams();
  const {
    audits: savedAudits,
    setAudits: setSavedAudits,
    leads,
    attachAuditToLead,
    leadFromAudit,
  } = useData();

  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [googleInfo, setGoogleInfo] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  // when arriving from a lead (?leadId=...), remember it so we can attach back
  const [linkedLeadId, setLinkedLeadId] = useState<string | null>(null);

  // Prefill from query params (e.g. "Run audit" from a lead)
  useEffect(() => {
    const qUrl = searchParams.get("url");
    const qName = searchParams.get("business");
    const qLead = searchParams.get("leadId");
    if (qUrl) setUrl(qUrl);
    if (qName) setBusinessName(qName);
    if (qLead) setLinkedLeadId(qLead);
  }, [searchParams]);

  const runAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    try {
      const apiKey = process.env.NEXT_PUBLIC_PAGESPEED_KEY || "";
      const keyParam = apiKey ? `&key=${apiKey}` : "";
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        targetUrl
      )}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO${keyParam}`;

      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`PageSpeed API returned ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();

      const lh = data.lighthouseResult;
      const categories = lh.categories;
      const audits = lh.audits;

      const issues: string[] = [];
      const opportunities: string[] = [];

      // Collect failed audits as issues
      for (const [key, audit] of Object.entries(audits) as [string, Record<string, unknown>][]) {
        if (audit.score === 0 && audit.title && key !== "screenshot-thumbnails" && key !== "final-screenshot") {
          issues.push(audit.title as string);
        }
      }

      // Collect opportunities
      if (lh.audits["render-blocking-resources"]?.score === 0)
        opportunities.push("Remove render-blocking resources");
      if (lh.audits["uses-optimized-images"]?.score === 0)
        opportunities.push("Optimize images");
      if (lh.audits["uses-text-compression"]?.score === 0)
        opportunities.push("Enable text compression");
      if (lh.audits["unused-css-rules"]?.score !== undefined && lh.audits["unused-css-rules"]?.score < 1)
        opportunities.push("Remove unused CSS");
      if (lh.audits["unused-javascript"]?.score !== undefined && lh.audits["unused-javascript"]?.score < 1)
        opportunities.push("Remove unused JavaScript");
      if ((categories.performance?.score ?? 0) < 0.5)
        opportunities.push("Site needs a complete performance overhaul");
      if ((categories.seo?.score ?? 0) < 0.8)
        opportunities.push("SEO needs significant improvement");
      if ((categories.accessibility?.score ?? 0) < 0.8)
        opportunities.push("Accessibility issues need fixing");

      const auditResult: AuditResult = {
        url: targetUrl,
        fetchedAt: new Date().toISOString(),
        strategy,
        performance: Math.round((categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
        seo: Math.round((categories.seo?.score ?? 0) * 100),
        fcp: audits["first-contentful-paint"]?.displayValue ?? "N/A",
        lcp: audits["largest-contentful-paint"]?.displayValue ?? "N/A",
        cls: audits["cumulative-layout-shift"]?.displayValue ?? "N/A",
        tbt: audits["total-blocking-time"]?.displayValue ?? "N/A",
        speedIndex: audits["speed-index"]?.displayValue ?? "N/A",
        ttfb: audits["server-response-time"]?.displayValue ?? "N/A",
        mobileFriendly: strategy === "mobile" ? (categories.performance?.score ?? 0) > 0.5 : true,
        issues: issues.slice(0, 10),
        opportunities: opportunities.slice(0, 8),
      };

      setResult(auditResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) {
        setError("Daily API limit reached. Try again tomorrow, or add your own free Google API key in Vercel env vars (NEXT_PUBLIC_PAGESPEED_KEY). You can also run audits manually at pagespeed.web.dev");
      } else {
        setError(msg || "Failed to run audit. Check the URL and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAudit = () => {
    const audit: SavedAudit = {
      id: "a" + Date.now(),
      url: url.trim(),
      businessName: businessName.trim(),
      googleInfo: googleInfo.trim(),
      manualNotes: manualNotes.trim(),
      result,
      createdAt: new Date().toISOString(),
      leadId: linkedLeadId || undefined,
    };
    setSavedAudits((prev) => [audit, ...prev]);
    // POST to server so reports work on any device
    fetch("/api/audit/" + audit.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audit }),
    }).catch(() => {});
    // if this audit came from a lead, push the metrics back onto it
    if (linkedLeadId && result) {
      attachAuditToLead(linkedLeadId, result);
    }
    setUrl("");
    setBusinessName("");
    setGoogleInfo("");
    setManualNotes("");
    setResult(null);
    setLinkedLeadId(null);
  };

  // Save the current scan straight into the Lead Pipeline
  const saveAsLead = () => {
    const draft: SavedAudit = {
      id: "a" + Date.now(),
      url: url.trim(),
      businessName: businessName.trim(),
      googleInfo: googleInfo.trim(),
      manualNotes: manualNotes.trim(),
      result,
      createdAt: new Date().toISOString(),
    };
    // persist the audit too so it shows under Saved Audits, then make a lead
    setSavedAudits((prev) => [draft, ...prev]);
    leadFromAudit(draft);
    setUrl("");
    setBusinessName("");
    setGoogleInfo("");
    setManualNotes("");
    setResult(null);
    setLinkedLeadId(null);
  };

  const exportAudit = () => {
    if (!result) return;
    const text = `WEBSITE AUDIT REPORT · 555 Digital
==========================================
Business: ${businessName || "N/A"}
URL: ${result.url}
Date: ${new Date(result.fetchedAt).toLocaleDateString()}
Strategy: ${result.strategy}

SCORES
---
Performance: ${result.performance}/100
Accessibility: ${result.accessibility}/100
Best Practices: ${result.bestPractices}/100
SEO: ${result.seo}/100

CORE WEB VITALS
---
First Contentful Paint: ${result.fcp}
Largest Contentful Paint: ${result.lcp}
Cumulative Layout Shift: ${result.cls}
Total Blocking Time: ${result.tbt}
Speed Index: ${result.speedIndex}
Time to First Byte: ${result.ttfb}

ISSUES FOUND (${result.issues.length})
---
${result.issues.map((i) => "• " + i).join("\n")}

OPPORTUNITIES
---
${result.opportunities.map((o) => "• " + o).join("\n")}

${manualNotes ? "NOTES\n---\n" + manualNotes : ""}
${googleInfo ? "\nGOOGLE BUSINESS INFO\n---\n" + googleInfo : ""}

==========================================
Audit by 555 Digital · https://555digital.dev
`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${businessName || "website"}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };

  const inputCls =
    "w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text-primary text-sm focus:border-primary focus:outline-none placeholder:text-text-muted";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-primary" /> Site Audit
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Scan any website and generate a free audit report to send prospects
        </p>
      </div>

      {linkedLeadId && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Auditing for lead:{" "}
          <span className="font-semibold">
            {leads.find((l) => l.id === linkedLeadId)?.businessName ||
              "selected lead"}
          </span>
          . Saving will attach these scores back to the lead.
        </div>
      )}

      {/* Audit Form */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-text-secondary text-xs mb-1.5 block">
              Website URL *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                placeholder="example.com"
                className={`${inputCls} pl-10`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
              />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-xs mb-1.5 block">
              Business Name
            </label>
            <input
              placeholder="e.g. Joe's Landscaping"
              className={inputCls}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-xs mb-1.5 block">
            Google Business Info (paste from Google Maps)
          </label>
          <textarea
            rows={3}
            placeholder="Paste their Google Business info here · name, address, rating, hours, phone..."
            className={`${inputCls} resize-none`}
            value={googleInfo}
            onChange={(e) => setGoogleInfo(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-surface-2 rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setStrategy("mobile")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm ${
                strategy === "mobile"
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted"
              }`}
            >
              <Smartphone className="w-4 h-4" /> Mobile
            </button>
            <button
              onClick={() => setStrategy("desktop")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm ${
                strategy === "desktop"
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted"
              }`}
            >
              <Monitor className="w-4 h-4" /> Desktop
            </button>
          </div>

          <button
            onClick={runAudit}
            disabled={loading || !url.trim()}
            className="bg-primary text-background px-6 py-2.5 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <FileSearch className="w-4 h-4" /> Run Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
            <p className="text-danger text-sm">{error}</p>
          </div>
          {url.trim() && (
            <a
              href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(
                url.trim().startsWith("http") ? url.trim() : "https://" + url.trim()
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary text-sm mt-2 hover:underline"
            >
              <Globe className="w-4 h-4" /> Run audit on PageSpeed Insights instead →
            </a>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-slide-in">
          {/* Scores */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Audit Results
                </h2>
                <p className="text-text-muted text-xs mt-1">
                  {result.url} · {result.strategy} · {new Date(result.fetchedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportAudit}
                  className="bg-surface-2 border border-border text-text-secondary px-4 py-2 rounded-lg text-sm hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export Report
                </button>
                <button
                  onClick={saveAsLead}
                  className="bg-warning/10 text-warning border border-warning/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warning/20 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Save as Lead
                </button>
                <button
                  onClick={saveAudit}
                  className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all"
                >
                  {linkedLeadId ? "Save & Attach to Lead" : "Save Audit"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <ScoreCircle score={result.performance} label="Performance" />
              <ScoreCircle score={result.accessibility} label="Accessibility" />
              <ScoreCircle score={result.bestPractices} label="Best Practices" />
              <ScoreCircle score={result.seo} label="SEO" />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Core Web Vitals
            </h2>
            <MetricRow label="First Contentful Paint" value={result.fcp} good={parseNum(result.fcp) < 2} />
            <MetricRow label="Largest Contentful Paint" value={result.lcp} good={parseNum(result.lcp) < 2.5} />
            <MetricRow label="Cumulative Layout Shift" value={result.cls} good={parseNum(result.cls) < 0.1} />
            <MetricRow label="Total Blocking Time" value={result.tbt} good={parseNum(result.tbt) < 300} />
            <MetricRow label="Speed Index" value={result.speedIndex} good={parseNum(result.speedIndex) < 4} />
            <MetricRow label="Time to First Byte" value={result.ttfb} good={parseNum(result.ttfb) < 800} />
          </div>

          {/* Issues + Opportunities */}
          <div className="grid md:grid-cols-2 gap-6">
            {result.issues.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-danger mb-4">
                  Issues Found ({result.issues.length})
                </h2>
                <ul className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.opportunities.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-warning mb-4">
                  Opportunities ({result.opportunities.length})
                </h2>
                <ul className="space-y-2">
                  {result.opportunities.map((opp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Manual Notes */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Your Notes
            </h2>
            <textarea
              rows={4}
              placeholder="Add your own observations · design issues, missing features, what you'd fix..."
              className={`${inputCls} resize-none`}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Saved Audits */}
      {savedAudits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-4">
            Saved Audits
          </h2>
          <div className="space-y-3">
            {savedAudits.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  setUrl(a.url || "");
                  setBusinessName(a.businessName || "");
                  setResult(a.result);
                  setManualNotes(a.manualNotes || "");
                  setGoogleInfo(a.googleInfo || "");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all group"
              >
                <div>
                  <h3 className="text-text-primary font-medium">
                    {a.businessName || a.url}
                  </h3>
                  <p className="text-text-muted text-xs">
                    {a.url} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {a.result && (
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <span className={`text-lg font-bold ${
                          a.result.performance >= 90
                            ? "text-accent"
                            : a.result.performance >= 50
                            ? "text-warning"
                            : "text-danger"
                        }`}>
                          {a.result.performance}
                        </span>
                        <p className="text-text-muted text-[10px]">Perf</p>
                      </div>
                      <div className="text-center">
                        <span className={`text-lg font-bold ${
                          a.result.seo >= 90
                            ? "text-accent"
                            : a.result.seo >= 50
                            ? "text-warning"
                            : "text-danger"
                        }`}>
                          {a.result.seo}
                        </span>
                        <p className="text-text-muted text-[10px]">SEO</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const reportUrl = `${window.location.origin}/audit/report/${a.id}`;
                        navigator.clipboard.writeText(reportUrl);
                        alert("Report link copied!\n\n" + reportUrl);
                      }}
                      className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-medium"
                    >
                      📋 Share
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading audit…
        </div>
      }
    >
      <AuditPageInner />
    </Suspense>
  );
}
