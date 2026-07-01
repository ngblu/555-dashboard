// POST /api/lead-finder/run — Multi-agent lead finder (runs on Vercel)
// Accepts single target OR multiple targets array — processes in parallel
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for multi-target parallel runs

import { NextRequest, NextResponse } from "next/server";

interface Target {
  city: string;
  state: string;
  industry: string;
}

interface LeadResult {
  businessName: string;
  website: string;
  industry: string;
  area: string;
  audit: Record<string, unknown> | null;
}

interface TargetReport {
  target: Target;
  totalFound: number;
  leadsCreated: number;
  leads: LeadResult[];
  error?: string;
}

async function searchDuckDuckGo(query: string): Promise<{ name: string; website: string; snippet: string }[]> {
  const businesses: { name: string; website: string; snippet: string }[] = [];

  // 1. Try DDG API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const ddgRes = await fetch(ddgUrl, { signal: AbortSignal.timeout(10000) });
    const ddgData = await ddgRes.json();
    const results = (ddgData.RelatedTopics || [])
      .filter((t: any) => t.FirstURL && t.Text)
      .slice(0, 5);
    for (const r of results) {
      const website = r.FirstURL.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const name = r.Text.split(" - ")[0] || r.Text.slice(0, 60);
      businesses.push({ name, website, snippet: r.Text });
    }
  } catch { /* fall through to HTML scraping */ }

  // 2. HTML scraping fallback (page 2 of DDG = more diverse results)
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15000),
    });
    const html = await searchRes.text();

    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^]*?)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^]*?)<\/a>/g;

    const snippets: string[] = [];
    let m;
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]*>/g, "").trim());
    }

    let idx = 0;
    while ((m = linkRegex.exec(html)) !== null) {
      const rawUrl = m[1];
      const urlMatch = rawUrl.match(/uddg=([^&]*)/);
      const website = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
      const name = m[2].replace(/<[^>]*>/g, "").trim();
      if (website && name && !website.includes("duckduckgo.com") && idx < 5) {
        // Avoid duplicate businesses from API + HTML
        const already = businesses.find(b => b.website === website || b.name === name);
        if (!already) {
          businesses.push({ name, website, snippet: snippets[idx] || "" });
        }
        idx++;
      }
    }
  } catch { /* HTML scrape failed, use whatever we got from API */ }

  // 3. Bridge fallback — search from residential IP (bypasses Vercel DDG block)
  if (businesses.length === 0) {
    try {
      const bridgeRes = await fetch("http://localhost:5555/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(30000),
      });
      if (bridgeRes.ok) {
        const bridgeData = await bridgeRes.json();
        if (bridgeData.results && bridgeData.results.length > 0) {
          for (const r of bridgeData.results) {
            businesses.push({ name: r.name, website: r.website, snippet: r.snippet || "" });
          }
        }
      }
    } catch { /* bridge unavailable — no results */ }
  }

  return businesses.slice(0, 10);
}

async function runPageSpeedAudit(website: string): Promise<Record<string, unknown> | null> {
  try {
    const targetUrl = website.startsWith("http") ? website : `https://${website}`;
    const apiKey = process.env.PAGESPEED_API_KEY || "";
    const keyParam = apiKey ? `&key=${apiKey}` : "";
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES${keyParam}`;

    const psRes = await fetch(psUrl, { signal: AbortSignal.timeout(25000) });
    if (!psRes.ok) return null;

    const psData = await psRes.json();
    const lh = psData.lighthouseResult;
    const cats = lh?.categories || {};
    return {
      url: targetUrl,
      fetchedAt: new Date().toISOString(),
      strategy: "mobile",
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
      fcp: lh?.audits?.["first-contentful-paint"]?.displayValue ?? "N/A",
      lcp: lh?.audits?.["largest-contentful-paint"]?.displayValue ?? "N/A",
      cls: lh?.audits?.["cumulative-layout-shift"]?.displayValue ?? "N/A",
      tbt: lh?.audits?.["total-blocking-time"]?.displayValue ?? "N/A",
      speedIndex: lh?.audits?.["speed-index"]?.displayValue ?? "N/A",
      ttfb: lh?.audits?.["server-response-time"]?.displayValue ?? "N/A",
      mobileFriendly: (cats.performance?.score ?? 0) > 0.5,
      issues: [],
      opportunities: [],
    };
  } catch {
    return null;
  }
}

async function createLead(biz: { name: string; website: string; snippet: string }, industry: string, area: string, audit: Record<string, unknown> | null): Promise<LeadResult> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const leadBody = {
    businessName: biz.name,
    website: biz.website,
    industry,
    area,
    source: "page2_audit",
    notes: `Auto-discovered via DuckDuckGo: ${biz.snippet || ""}`.trim(),
    audit,
  };

  try {
    const leadRes = await fetch(`${baseUrl}/api/submit-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadBody),
    });
    const leadJson = await leadRes.json();
    return leadJson.lead || leadBody;
  } catch {
    return leadBody as LeadResult;
  }
}

async function processTarget(target: Target): Promise<TargetReport> {
  const query = `${target.industry} company ${target.city} ${target.state}`;
  const area = `${target.city}, ${target.state}`;
  const leads: LeadResult[] = [];

  try {
    const businesses = await searchDuckDuckGo(query);

    // Process up to 5 businesses per target, audit in parallel within target
    const bizBatch = businesses.slice(0, 5);
    const auditPromises = bizBatch.map(async (biz) => {
      const audit = await runPageSpeedAudit(biz.website);
      const lead = await createLead(biz, target.industry, area, audit);
      return lead;
    });

    const results = await Promise.allSettled(auditPromises);
    for (const r of results) {
      if (r.status === "fulfilled") leads.push(r.value);
    }

    return {
      target,
      totalFound: businesses.length,
      leadsCreated: leads.length,
      leads,
    };
  } catch (e) {
    return {
      target,
      totalFound: 0,
      leadsCreated: 0,
      leads: [],
      error: String(e),
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Support both single target (backward compat) and multi-target
    const targets: Target[] = body.targets || [
      {
        city: body.city || "Cookeville",
        state: body.state || "TN",
        industry: body.industry || "Plumbing",
      },
    ];

    // Process all targets in parallel (multi-agent!)
    const reports = await Promise.all(targets.map(processTarget));

    // Aggregate results
    const totalFound = reports.reduce((sum, r) => sum + r.totalFound, 0);
    const totalLeads = reports.reduce((sum, r) => sum + r.leadsCreated, 0);
    const allLeads = reports.flatMap(r => r.leads);
    const errors = reports.filter(r => r.error).map(r => ({ target: r.target, error: r.error }));

    return NextResponse.json({
      success: totalLeads > 0,
      totalTargets: targets.length,
      totalFound,
      leadsCreated: totalLeads,
      leads: allLeads,
      targetsProcessed: reports.filter(r => !r.error).length,
      targetsFailed: errors.length,
      reports, // per-target breakdown for UI progress
      errors: errors.length > 0 ? errors : undefined,
      query: targets.map(t => `${t.industry} in ${t.city}, ${t.state}`).join(" | "),
    });
  } catch (e) {
    console.error("lead-finder error:", e);
    return NextResponse.json(
      { success: false, error: "Search failed. Try again." },
      { status: 500 }
    );
  }
}
