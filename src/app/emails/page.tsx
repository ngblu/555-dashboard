"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, X, Send, CheckCircle2, AlertCircle, Eye, Reply, Clock, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";

export default function EmailsPage() {
  const { emailLogs, setEmailLogs, logEmail, leads, clients } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leadId: "", clientId: "", to: "", subject: "", status: "sent" as const, notes: "" });

  // Handle prefill from GeneratePitch
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const prefill = search.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setForm(f => ({ ...f, to: data.to || "", subject: data.subject || data.body?.split("\n")[0]?.replace("Subject: ", "") || "" }));
        setShowForm(true);
        window.history.replaceState({}, "", "/emails");
      } catch {}
    }
  }, []);

  const handleSend = () => {
    if (!form.subject || !form.to) return;
    logEmail({ leadId: form.leadId || undefined, clientId: form.clientId || undefined, to: form.to, subject: form.subject, status: form.status, notes: form.notes || undefined });
    setForm({ leadId: "", clientId: "", to: "", subject: "", status: "sent", notes: "" });
    setShowForm(false);
  };

  const updateStatus = (id: string, newStatus: "sent" | "opened" | "replied" | "bounced") => {
    setEmailLogs((prev: any[]) => prev.map((e: any) => {
      if (e.id !== id) return e;
      const updated = { ...e, status: newStatus };
      if (newStatus === "opened") updated.openedAt = new Date().toISOString();
      return updated;
    }));
  };

  const statusIcon = { sent: Send, opened: Eye, replied: Reply, bounced: AlertCircle };
  const statusColor = { sent: "text-text-muted", opened: "text-primary", replied: "text-accent", bounced: "text-danger" };

  // Find stale leads (emailed but no reply in 5 days)
  const staleLeads = leads.filter((l: { status: string }) => l.status === "emailed" || l.status === "replied");
  const now = Date.now();
  const needsFollowUp = emailLogs.filter((e: any) =>
    (e.status === "sent" || e.status === "opened") &&
    e.leadId &&
    (now - new Date(e.sentAt).getTime()) > 5 * 86400000
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="w-6 h-6 text-primary" /> Cold Emails</h1>
          <p className="text-text-secondary text-sm mt-1">{emailLogs.length} emails tracked · {needsFollowUp.length} need follow-up</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Log Email
        </button>
      </div>

      {/* Follow-up Alert */}
      {needsFollowUp.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm mb-3">
            <Clock className="w-4 h-4" /> {needsFollowUp.length} emails need follow-up (5+ days since sent)
          </div>
          <div className="space-y-2">
            {needsFollowUp.map((e: any) => {
              const linkedLead = leads.find((l: { id: string }) => l.id === e.leadId);
              return (
                <div key={e.id} className="flex items-center justify-between text-xs text-warning/80 bg-warning/5 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium">{e.subject}</span>
                    <span className="mx-2">·</span>
                    <span>{e.to}</span>
                    {linkedLead && <span className="ml-2 text-text-muted">({linkedLead.businessName})</span>}
                  </div>
                  <span>{Math.floor((now - new Date(e.sentAt).getTime()) / 86400000)}d ago</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Email Form */}
      {showForm && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.leadId} onChange={e => {
              const lead = leads.find((l: { id: string }) => l.id === e.target.value);
              setForm({ ...form, leadId: e.target.value, to: (lead as { contactEmail?: string })?.contactEmail || form.to, subject: lead ? `Website audit for ${(lead as { businessName: string }).businessName}` : form.subject });
            }}>
              <option value="">Link to lead (optional)</option>
              {leads.map((l: { id: string; businessName: string }) => <option key={l.id} value={l.id}>{l.businessName}</option>)}
            </select>
            <select className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}>
              <option value="sent">Sent</option>
              <option value="opened">Opened</option>
              <option value="replied">Replied</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
          <input placeholder="To (email address)" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
          <input placeholder="Subject line" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder="Notes (what you said, template used, etc.)" className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted h-20 resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button onClick={handleSend} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium" disabled={!form.subject || !form.to}>Log Email</button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="space-y-2">
        {emailLogs.length === 0 && (
          <div className="text-center py-12"><Mail className="w-10 h-10 text-text-muted mx-auto mb-2" /><p className="text-text-muted">No emails logged yet. Start tracking your cold outreach.</p></div>
        )}
        {emailLogs.map((e: any) => {
          const Icon = statusIcon[e.status as keyof typeof statusIcon];
          const linkedLead = e.leadId ? leads.find((l: { id: string }) => l.id === e.leadId) : null;
          const daysAgo = Math.floor((now - new Date(e.sentAt).getTime()) / 86400000);
          const isStale = (e.status === "sent" || e.status === "opened") && daysAgo >= 5;
          return (
            <div key={e.id} className={`bg-surface-2 border rounded-xl p-3 group hover:border-border-bright transition-all ${isStale ? "border-warning/30" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${statusColor[e.status as keyof typeof statusColor]}`} />
                    <h3 className="font-medium text-sm text-text-primary truncate">{e.subject}</h3>
                    {isStale && <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning rounded font-medium shrink-0">Follow up</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{e.to}</span>
                    <span>·</span>
                    <span>{daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</span>
                    {e.openedAt && <><span>·</span><span>Opened</span></>}
                    {linkedLead && (
                      <a href={`/leads`} className="text-primary hover:underline ml-1">{linkedLead.businessName}</a>
                    )}
                  </div>
                  {e.notes && <p className="text-xs text-text-muted mt-1 truncate">{e.notes}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {e.status === "sent" && <button onClick={() => updateStatus(e.id, "opened")} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20" title="Mark as opened"><Eye className="w-3 h-3" /></button>}
                  {(e.status === "sent" || e.status === "opened") && <button onClick={() => updateStatus(e.id, "replied")} className="text-xs px-2 py-1 bg-accent/10 text-accent rounded hover:bg-accent/20" title="Mark as replied"><Reply className="w-3 h-3" /></button>}
                  <button onClick={() => updateStatus(e.id, "bounced")} className="text-xs px-2 py-1 bg-danger/10 text-danger rounded hover:bg-danger/20" title="Mark as bounced"><AlertCircle className="w-3 h-3" /></button>
                  <button onClick={() => setEmailLogs((prev: any[]) => prev.filter((x: any) => x.id !== e.id))} className="text-text-muted hover:text-danger p-1"><X className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
