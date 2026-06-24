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
    const { name, email, website, budget, message } = body;

    // Run PageSpeed audit if website URL provided
    let auditData = null;
    if (website) {
      try {
        let targetUrl = website.trim();
        if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
          targetUrl
        )}&strategy=mobile&category=PERFORMANCE&category=SEO`;
        const auditRes = await fetch(apiUrl, {
          signal: AbortSignal.timeout(25000),
        });

        if (auditRes.ok) {
          const data = await auditRes.json();
          const lh = data.lighthouseResult;
          auditData = {
            performance: Math.round(
              (lh.categories?.performance?.score ?? 0) * 100
            ),
            seo: Math.round((lh.categories?.seo?.score ?? 0) * 100),
            fcp:
              lh.audits?.["first-contentful-paint"]?.displayValue ?? "N/A",
            lcp:
              lh.audits?.["largest-contentful-paint"]?.displayValue ?? "N/A",
            speedIndex: lh.audits?.["speed-index"]?.displayValue ?? "N/A",
          };
        }
      } catch {
        // Audit failed silently
      }
    }

    const lead = {
      id: "lead_" + Date.now(),
      name,
      email,
      website: website || "",
      budget: budget || "",
      message: message || "",
      audit: auditData,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    // Persist to /tmp file
    const leads = readLeads();
    leads.unshift(lead);
    writeLeads(leads.slice(0, 100)); // Keep last 100

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
            subject: `New Lead: ${name} — ${website || "No website"}`,
            html: `<h2>New Audit Request</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Website:</strong> ${website || "None"}</p>
<p><strong>Budget:</strong> ${budget || "Not specified"}</p>
<p><strong>Message:</strong> ${message || "None"}</p>
${
  auditData
    ? `<h3>Auto-Audit</h3><p>Performance: ${auditData.performance}/100 | SEO: ${auditData.seo}/100 | FCP: ${auditData.fcp} | LCP: ${auditData.lcp}</p>`
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
