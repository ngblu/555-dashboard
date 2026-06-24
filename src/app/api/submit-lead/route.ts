import { NextRequest, NextResponse } from "next/server";

// In-memory store (resets on cold start, but works for MVP)
// For production, replace with Vercel KV or Postgres
const leads: Record<string, unknown>[] = [];

// Make it available globally so the GET endpoint can read it
if (!(globalThis as Record<string, unknown>).__leads) {
  (globalThis as Record<string, unknown>).__leads = leads;
}

function getLeads(): Record<string, unknown>[] {
  return ((globalThis as Record<string, unknown>).__leads as Record<string, unknown>[]) || [];
}

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
        
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile&category=PERFORMANCE&category=SEO`;
        const auditRes = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
        
        if (auditRes.ok) {
          const data = await auditRes.json();
          const lh = data.lighthouseResult;
          auditData = {
            performance: Math.round((lh.categories?.performance?.score ?? 0) * 100),
            seo: Math.round((lh.categories?.seo?.score ?? 0) * 100),
            fcp: lh.audits?.["first-contentful-paint"]?.displayValue ?? "N/A",
            lcp: lh.audits?.["largest-contentful-paint"]?.displayValue ?? "N/A",
            speedIndex: lh.audits?.["speed-index"]?.displayValue ?? "N/A",
          };
        }
      } catch {
        // Audit failed, continue without it
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

    // Store in memory
    getLeads().unshift(lead);

    // Try to send email notification via Resend (if configured)
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
<p><strong>Website:</strong> ${website || "None provided"}</p>
<p><strong>Budget:</strong> ${budget || "Not specified"}</p>
<p><strong>Message:</strong> ${message || "None"}</p>
${auditData ? `<h3>Auto-Audit Results</h3>
<p>Performance: ${auditData.performance}/100</p>
<p>SEO: ${auditData.seo}/100</p>
<p>FCP: ${auditData.fcp}</p>
<p>LCP: ${auditData.lcp}</p>` : "<p>No website provided for audit</p>"}`,
          }),
        });
      } catch {
        // Email failed, continue
      }
    }

    return NextResponse.json({ success: true, lead }, { 
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to process submission" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ leads: getLeads() }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
