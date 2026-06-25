"use client";

import { useParams } from "next/navigation";
import { useData } from "@/lib/store";
import { Shield, Zap, Search, Accessibility, Timer, Gauge, AlertTriangle, Lightbulb, Smartphone, ExternalLink } from "lucide-react";

export default function AuditReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { audits } = useData();
  const audit = audits.find((a: { id: string }) => a.id === id);

  if (!audit || !audit.result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-primary p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
          <p className="text-text-secondary">This audit report has expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const r = audit.result;

  const ScoreRing = ({ score, label, color }: { score: number; label: string; color: string }) => {
    const hue = score >= 90 ? "accent" : score >= 50 ? "warning" : "danger";
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" className="text-surface-2" strokeWidth="8" />
            <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" className={`text-${hue}`} strokeWidth="8" strokeDasharray={`${score * 2.51} 251`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-extrabold text-text-primary">{score}</span>
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-2 font-medium">{label}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
            <span>Website Audit Report</span>
            <span>·</span>
            <span>{new Date(r.fetchedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>·</span>
            <span className="uppercase text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.strategy}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2">{audit.businessName || audit.url}</h1>
          <a href={r.url.startsWith("http") ? r.url : `https://${r.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm">
            {r.url} <ExternalLink className="w-3 h-3" />
          </a>
          {audit.googleInfo && <p className="text-text-muted text-sm mt-3 max-w-xl">{audit.googleInfo}</p>}
        </div>
      </div>

      {/* Scores */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-lg font-bold text-text-primary mb-6">Performance Scores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ScoreRing score={r.performance} label="Performance" color="accent" />
          <ScoreRing score={r.accessibility} label="Accessibility" color="primary" />
          <ScoreRing score={r.bestPractices} label="Best Practices" color="secondary" />
          <ScoreRing score={r.seo} label="SEO" color="warning" />
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-surface border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-lg font-bold text-text-primary mb-6">Core Web Vitals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "FCP", value: r.fcp, desc: "First Contentful Paint" },
              { label: "LCP", value: r.lcp, desc: "Largest Contentful Paint" },
              { label: "TBT", value: r.tbt, desc: "Total Blocking Time" },
              { label: "CLS", value: r.cls, desc: "Cumulative Layout Shift" },
              { label: "Speed Index", value: r.speedIndex, desc: "How fast content appears" },
              { label: "TTFB", value: r.ttfb, desc: "Time to First Byte" },
            ].map(v => (
              <div key={v.label} className="bg-surface-2 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-text-primary mb-1">{v.value}</div>
                <div className="text-xs font-semibold text-primary mb-0.5">{v.label}</div>
                <div className="text-[10px] text-text-muted">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues */}
      {r.issues && r.issues.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Issues Found ({r.issues.length})
          </h2>
          <div className="space-y-3">
            {r.issues.map((issue: string, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-surface border border-border rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {r.opportunities && r.opportunities.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-10 border-t border-border">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" /> Opportunities ({r.opportunities.length})
          </h2>
          <div className="space-y-3">
            {r.opportunities.map((opp: string, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-surface border border-border rounded-xl p-4">
                <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">{opp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {audit.manualNotes && (
        <div className="max-w-4xl mx-auto px-6 py-10 border-t border-border">
          <h2 className="text-lg font-bold text-text-primary mb-4">Reviewer Notes</h2>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{audit.manualNotes}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border mt-10">
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <p className="text-text-muted text-sm mb-2">Report generated by</p>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="text-primary font-extrabold text-xl">555</span>
            <span className="text-text-primary font-semibold text-lg">Digital</span>
          </div>
          <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
            I find businesses with bad websites and rebuild them into something that actually works. Free audits, honest recommendations.
          </p>
          <a href="https://555digital.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-background font-semibold px-6 py-3 rounded-lg hover:shadow-[0_0_25px_rgba(0,212,255,0.35)] transition-all text-sm">
            <ExternalLink className="w-4 h-4" /> Visit 555 Digital
          </a>
        </div>
      </div>
    </div>
  );
}
