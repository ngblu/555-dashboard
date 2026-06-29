import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STORE_PATH = join("/tmp", "555-leads.json");

function readLeads(): Record<string, unknown>[] {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

function writeLeads(leads: Record<string, unknown>[]) {
  try {
    writeFileSync(STORE_PATH, JSON.stringify(leads));
  } catch {}
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      businessName,
      email,
      contactEmail,
      website,
      budget,
      message,
      phone,
      industry,
      source,
      notes,
      audit,
    } = body;

    // Normalize: support both name/businessName and email/contactEmail
    const bizName = (businessName || name || "Unknown").trim();
    const contact = (contactEmail || email || "").trim();

    // Run PageSpeed audit if website URL provided and no audit data passed
    let auditData = audit || null;
    if (website && !auditData) {
      try {
        let targetUrl = website.trim();
        if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

        const apiKey = process.env.PAGESPEED_API_KEY || "";
        const keyParam = apiKey ? `&key=${apiKey}` : "";
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
          targetUrl
        )}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES${keyParam}`;
        const auditRes = await fetch(apiUrl, {
          signal: AbortSignal.timeout(25000),
        });

        if (auditRes.ok) {
          const data = await auditRes.json();
          const lh = data.lighthouseResult;
          const cats = lh.categories || {};
          const audits = lh.audits || {};
          auditData = {
            url: targetUrl,
            fetchedAt: new Date().toISOString(),
            strategy: "mobile",
            performance: Math.round((cats.performance?.score ?? 0) * 100),
            seo: Math.round((cats.seo?.score ?? 0) * 100),
            accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
            bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
            fcp: audits["first-contentful-paint"]?.displayValue ?? "N/A",
            lcp: audits["largest-contentful-paint"]?.displayValue ?? "N/A",
            cls: audits["cumulative-layout-shift"]?.displayValue ?? "N/A",
            tbt: audits["total-blocking-time"]?.displayValue ?? "N/A",
            speedIndex: audits["speed-index"]?.displayValue ?? "N/A",
            ttfb: audits["server-response-time"]?.displayValue ?? "N/A",
            mobileFriendly: (cats.performance?.score ?? 0) > 0.5,
            issues: [],
            opportunities: [],
          };
        }
      } catch {
        // Audit failed silently
      }
    }

    const lead = {
      id: "lead_" + Date.now(),
      businessName: bizName,
      name: bizName,
      email: contact,
      contactEmail: contact,
      website: website || "",
      phone: phone || "",
      industry: industry || "",
      source: source || "website",
      notes: notes || message || "",
      budget: budget || "",
      message: message || "",
      audit: auditData,
      status: "found",
      createdAt: new Date().toISOString(),
    };

    // Persist to /tmp file
    const leads = readLeads();
    leads.unshift(lead);
    writeLeads(leads.slice(0, 100));

    // Try email notification
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "555 Digital <onboarding@resend.dev>",
            to: notifyEmail,
            subject: `New Lead: ${bizName} - ${website || "No website"}`,
            html: `<h2>New Lead</h2>
<p><strong>Business:</strong> ${bizName}</p>
<p><strong>Email:</strong> ${contact || "None"}</p>
<p><strong>Phone:</strong> ${phone || "None"}</p>
<p><strong>Website:</strong> ${website || "None"}</p>
<p><strong>Industry:</strong> ${industry || "N/A"}</p>
<p><strong>Source:</strong> ${source || "unknown"}</p>
<p><strong>Notes:</strong> ${notes || message || "None"}</p>
${
  auditData
    ? `<h3>Audit Scores</h3><p>Performance: ${auditData.performance}/100 | SEO: ${auditData.seo}/100 | A11y: ${auditData.accessibility}/100 | Best Practices: ${auditData.bestPractices}/100</p>`
    : "<p>No audit data</p>"
}`,
          }),
        });
      } catch {}
    }

    return NextResponse.json({ success: true, lead }, { headers: corsHeaders });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  const leads = readLeads();
  return NextResponse.json({ leads }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
