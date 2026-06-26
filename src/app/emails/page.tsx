"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, X, Send, Eye, Reply, Clock, Wand2, Loader2, BarChart3, ExternalLink, TrendingUp, Shield } from "lucide-react";
import { useData } from "@/lib/store";
import { generatePitch } from "@/components/ui/GeneratePitch";

export default function EmailsPage() {
  const { emailLogs, setEmailLogs, logEmail, leads } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: "", to: "", subject: "", body: "", notes: "" });
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Handle prefill from GeneratePitch
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const prefill = search.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setForm(f => ({ ...f, to: data.to || "", subject: data.subject || "", body: data.body || "" }));
        setShowForm(true);
        window.history.replaceState({}, "", "/emails");
      } catch {}
    }
  }, []);

  const handleSend = () => {
    if (!form.subject || !form.to) return;
    logEmail({ leadId: form.leadId || undefined, to: form.to, subject: form.subject, status: "sent", notes: form.notes || undefined });
    setForm({ leadId: "", to: "", subject: "", body: "", notes: "" });
    setShowForm(false);
  };

  const handleActualSend = async (e: { id: string; to: string; subject: string; body?: string; notes?: string }) => {
    setSending(e.id);
    try {
      const body = e.body || e.notes || "";
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: e.to, subject: e.subject, body }),
      });
      const data = await res.json();
      if (data.success) {
        setSentIds(prev => new Set(prev).add(e.id));
      } else {
        alert(data.error || "Send failed. Add RESEND_API_KEY to Vercel env vars to enable sending.");
      }
    } catch (err) {
      alert("Send failed: " + String(err));
    }
    setSending(null);
  };

  const updateStatus = (id: string, status: "opened" | "replied" | "bounced") => {
    setEmailLogs((prev: any[]) => prev.map((e: any) => {
      if (e.id !== id) return e;
      const updated = { ...e, status };
      if (status === "opened") updated.openedAt = new Date().toISOString();
      return updated;
    }));
  };

  const generateForLead = (leadId: string) => {
    const lead = leads.find((l: { id: string }) => l.id === leadId);
    if (!lead) return;
    const text = generatePitch({
      businessName: (lead as any).businessName,
      website: (lead as any).website,
      contactEmail: (lead as any).contactEmail,
      auditScores: (lead as any).audit ? { performance: (lead as any).audit.performance, seo: (lead as any).audit.seo, accessibility: (lead as any).audit.accessibility } : null,
      issues: (lead as any).issues || [],
    });
    const lines = text.split("\n");
    const subject = lines[0].replace("Subject: ", "");
    const body = lines.slice(1).join("\n").trim();
    setForm({ leadId, to: (lead as any).contactEmail || "", subject, body, notes: "" });
    setShowForm(true);
  };

  const now = Date.now();
  const needsFollowUp = (emailLogs as any[]).filter((e: any) =>
    (e.status === "sent" || e.status === "opened") && e.leadId && (now - new Date(e.sentAt).getTime()) > 5 * 86400000
  );

  const statusBadge = (s: string) => {
    const map: Record<string, { color: string; label: string }> = {
      sent: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Sent" },
      opened: { color: "bg-primary/10 text-primary border-primary/20", label: "Opened" },
      replied: { color: "bg-accent/10 text-accent border-accent/20", label: "Replied" },
      bounced: { color: "bg-danger/10 text-danger border-danger/20", label: "Bounced" },
    };
    const m = map[s] || map.sent;
    return <span className={`text-[10px] px-2 py-0.5 rounded border ${m.color}`}>{m.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="w-6 h-6 text-primary" /> Cold Emails</h1>
          <p className="text-text-secondary text-sm mt-1">{(emailLogs as any[]).length} tracked{needsFollowUp.length > 0 ? ` · ${needsFollowUp.length} need follow-up` : ""}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setForm({ leadId: "", to: "", subject: "", body: "", notes: "" }); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Email
          </button>
        </div>
      </div>

      {/* Follow-up Alert */}
      {needsFollowUp.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm mb-3">
            <Clock className="w-4 h-4" /> {needsFollowUp.length} email{needsFollowUp.length > 1 ? "s" : ""} need following up (5+ days)
          </div>
          <div className="space-y-1.5">
            {needsFollowUp.map((e: any) => {
              const l = leads.find((l2: any) => l2.id === e.leadId);
              const days = Math.floor((now - new Date(e.sentAt).getTime()) / 86400000);
              return (
                <div key={e.id} className="flex items-center justify-between text-xs bg-warning/5 rounded px-3 py-1.5">
                  <span className="text-text-secondary">{l?.businessName || e.to} · {e.subject}</span>
                  <span className="text-warning font-medium">{days}d ago</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compose Form */}
      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary flex-1" value={form.leadId} onChange={e => {
              const l = leads.find((l2: any) => l2.id === e.target.value);
              setForm({ ...form, leadId: e.target.value, to: l?.contactEmail || form.to, subject: l ? `${l.businessName} — website audit` : form.subject });
            }}>
              <option value="">Link to lead (optional)</option>
              {leads.map((l: any) => <option key={l.id} value={l.id}>{l.businessName}</option>)}
            </select>
            {form.leadId && (
              <button onClick={() => generateForLead(form.leadId)} className="text-xs px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 font-medium flex items-center gap-1.5 shrink-0">
                <Wand2 className="w-3.5 h-3.5" /> Generate Pitch
              </button>
            )}
          </div>

          {/* Audit Preview + Comparison */}
          {form.leadId && (() => {
            const lead = leads.find((l: any) => l.id === form.leadId);
            if (!lead) return null;
            const audit = lead.audit;
            const hasSite = !!lead.website;
            return (
              <div className="grid grid-cols-2 gap-3">
                {/* Their Audit */}
                <div className="bg-surface border border-border rounded-lg p-4">
                  <h4 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-warning" /> {lead.website || "Their Site"}
                  </h4>
                  {audit ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Perf</span>
                        <span className={audit.performance > 70 ? "text-accent" : audit.performance > 40 ? "text-warning" : "text-danger"}>{audit.performance}/100</span>
                      </div>
                      <div className="w-full h-1 bg-surface-2 rounded-full"><div className="h-full bg-warning rounded-full" style={{ width: `${audit.performance}%` }} /></div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">SEO</span>
                        <span className={audit.seo > 70 ? "text-accent" : audit.seo > 40 ? "text-warning" : "text-danger"}>{audit.seo}/100</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">A11y</span>
                        <span className={audit.accessibility > 70 ? "text-accent" : audit.accessibility > 40 ? "text-warning" : "text-danger"}>{audit.accessibility}/100</span>
                      </div>
                      {audit.fcp && <div className="flex justify-between text-xs"><span className="text-text-muted">FCP</span><span className="text-text-secondary">{audit.fcp}</span></div>}
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs">No audit yet. <a href="/audit" className="text-primary hover:underline">Run one</a></p>
                  )}
                </div>

                {/* 555 Digital Comparison */}
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <h4 className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-accent" /> After 555 Digital
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Perf</span>
                      <span className="text-accent">95-100</span>
                    </div>
                    <div className="w-full h-1 bg-surface-2 rounded-full"><div className="h-full bg-accent rounded-full" style={{ width: "96%" }} /></div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">SEO</span>
                      <span className="text-accent">90-98</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">A11y</span>
                      <span className="text-accent">95+</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Load</span>
                      <span className="text-accent">&lt;1s</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-accent/10">
                      <a href="https://pyburn-plumbing.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> See a live example →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <input placeholder="To: email address" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
          <input placeholder="Subject line" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder="Email body (generated pitch goes here, or write your own)" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted h-32 resize-none" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <input placeholder="Notes (optional)" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={handleSend} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium" disabled={!form.subject || !form.to}>Log Email</button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="space-y-2">
        {(emailLogs as any[]).length === 0 && (
          <div className="text-center py-12"><Mail className="w-10 h-10 text-text-muted mx-auto mb-2" /><p className="text-text-muted">No emails yet. Generate a pitch from the Leads page or compose one here.</p></div>
        )}
        {(emailLogs as any[]).map((e: any) => {
          const linkedLead = e.leadId ? leads.find((l: any) => l.id === e.leadId) : null;
          const daysAgo = Math.floor((now - new Date(e.sentAt).getTime()) / 86400000);
          const isStale = (e.status === "sent" || e.status === "opened") && daysAgo >= 5;
          const wasSent = sentIds.has(e.id);
          return (
            <div key={e.id} className={`bg-surface-2 border rounded-xl p-4 group hover:border-border-bright transition-all ${isStale ? "border-warning/30" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <Mail className={`w-5 h-5 mt-0.5 shrink-0 ${wasSent ? "text-accent" : e.status === "replied" ? "text-accent" : e.status === "bounced" ? "text-danger" : e.status === "opened" ? "text-primary" : "text-text-muted"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm text-text-primary truncate">{e.subject}</h3>
                    {statusBadge(e.status)}
                    {wasSent && <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent">✓ Sent via Resend</span>}
                    {isStale && <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning rounded font-medium">Follow up</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{e.to}</span>
                    <span>·</span>
                    <span>{daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</span>
                    {e.openedAt && <span>· Opened</span>}
                    {linkedLead && <a href="/leads" className="text-primary hover:underline">{linkedLead.businessName}</a>}
                  </div>
                  {(e.notes || e.body) && <p className="text-xs text-text-muted mt-1.5 truncate max-w-md">{e.body || e.notes}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {e.status === "sent" && (
                    <button onClick={() => updateStatus(e.id, "opened")} className="text-xs p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20" title="Mark opened"><Eye className="w-3.5 h-3.5" /></button>
                  )}
                  {(e.status === "sent" || e.status === "opened") && (
                    <button onClick={() => updateStatus(e.id, "replied")} className="text-xs p-1.5 bg-accent/10 text-accent rounded hover:bg-accent/20" title="Mark replied"><Reply className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => handleActualSend(e)} disabled={sending === e.id} className="text-xs p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20" title="Actually send via email">
                    {sending === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEmailLogs((prev: any[]) => prev.filter((x: any) => x.id !== e.id))} className="text-xs p-1.5 text-text-muted hover:text-danger rounded hover:bg-danger/10"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
