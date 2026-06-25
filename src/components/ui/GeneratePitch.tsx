"use client";

import { useState } from "react";
import { Mail, Wand2, Copy, Send } from "lucide-react";

interface Props {
  businessName: string;
  website: string;
  contactName?: string;
  contactEmail?: string;
  auditScores?: { performance: number; seo: number; accessibility: number } | null;
  issues?: string[];
  industry?: string;
}

export function generatePitch({ businessName, website, contactName, auditScores, issues, industry }: Props): string {
  const name = contactName || "there";
  const domain = website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const industryStr = industry || "business";
  const perf = auditScores?.performance;
  const seo = auditScores?.seo;

  const templates = [
    // Template 1: Audit-focused
    `Subject: Quick website audit for ${domain || businessName}

Hi ${name},

I ran a quick audit on ${domain || "your website"} and found a few things that might be costing you customers.

${perf !== undefined ? `• Performance score: ${perf}/100 — ${perf < 50 ? "this is what makes people leave before your site even loads" : perf < 70 ? "room to improve here" : "looking solid"}
• SEO score: ${seo}/100 — ${(seo ?? 0) < 50 ? "you're probably not showing up on Google for people searching your services" : (seo ?? 0) < 70 ? "decent, but we can push this higher" : "pretty good"}` : ""}

${issues?.slice(0, 3).map((i, idx) => `• ${i}`).join("\n") || ""}

I'm Noah, I run 555 Digital — I find ${industryStr} businesses with outdated websites and rebuild them so they actually bring in calls and bookings. I'd love to do a free audit report for you, no strings attached, and walk you through what I'd fix.

Want me to send the full report over?

Best,
Noah
555 Digital`,

    // Template 2: Direct/punchy
    `Subject: Your website and why your phone isn't ringing

Hey ${name},

Quick one — I looked at ${domain || "your site"} and ${perf && perf < 50 ? "it's loading pretty slow, which means people are leaving before they even see what you do" : "there are some things we could tighten up to get more calls from it"}.

I run a small web studio called 555 Digital. I work specifically with ${industryStr} businesses — I audit their sites, show them what's costing them customers, and rebuild everything so their phone actually rings.

Free audit, zero pressure. Takes 2 minutes. Want me to send it over?

Noah
555 Digital`,

    // Template 3: Value-focused
    `Subject: Found some issues on ${domain || "your website"}

Hi ${name},

I run 555 Digital, a small web studio that helps ${industryStr} businesses turn their websites into actual customer pipelines.

I took a look at ${domain || "your site"} — ${perf !== undefined ? `your performance score is ${perf}/100, which means ${perf < 50 ? "you're losing visitors before the page finishes loading" : "there's room to improve load times and conversions"}. ` : ""}${seo !== undefined ? `Your SEO is at ${seo}/100${seo < 60 ? ", which means people searching for your services in your area probably aren't finding you" : ""}.` : ""}

I'd love to send you a full audit report — it's free and takes me about 2 minutes. No pitch, no pressure. Just useful info about your site.

Interested?

Noah
555 Digital`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export default function GeneratePitchButton({ lead, onGenerated }: { lead: Props; onGenerated?: (email: { subject: string; body: string }) => void }) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const text = generatePitch(lead);
    const subject = text.split("\n")[0].replace("Subject: ", "");
    const body = text.split("\n").slice(1).join("\n").trim();
    setGenerated(body);
    onGenerated?.({ subject, body });
  };

  const handleCopy = () => {
    if (generated) {
      navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={handleGenerate}
        className="text-xs px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-medium flex items-center gap-1.5"
      >
        <Wand2 className="w-3 h-3" /> {generated ? "Regenerate" : "Generate Pitch"}
      </button>
      {generated && (
        <>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1.5 bg-accent/10 text-accent rounded hover:bg-accent/20 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={`/emails?prefill=${encodeURIComponent(JSON.stringify({ to: lead.contactEmail || "", subject: generated.split("\n")[1]?.replace("Subject: ", "") || `${lead.businessName} website audit` }))}`}
            className="text-xs px-2 py-1.5 bg-secondary/10 text-secondary rounded hover:bg-secondary/20 flex items-center gap-1"
          >
            <Send className="w-3 h-3" /> Log Email
          </a>
        </>
      )}
    </div>
  );
}
