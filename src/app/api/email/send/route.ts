import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured. Add it to Vercel env vars." }, { status: 500 });
  }

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Noah @ 555 Digital <noah@555digital.dev>",
        to: [to],
        subject,
        text: body,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || "Send failed" }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Send failed" }, { status: 500 });
  }
}
