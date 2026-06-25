import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { projectId, name, amount } = await req.json();
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Use test mode prices for now
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": name || "Website Project Deposit",
        "line_items[0][price_data][unit_amount]": String(amount || 5000),
        "line_items[0][quantity]": "1",
        "mode": "payment",
        "success_url": `${req.headers.get("origin") || "https://555-dashboard.vercel.app"}/projects?paid=true`,
        "cancel_url": `${req.headers.get("origin") || "https://555-dashboard.vercel.app"}/projects?paid=false`,
        "metadata[project_id]": projectId || "",
      }),
    });

    const session = await res.json();
    if (session.error) {
      return NextResponse.json({ error: session.error.message }, { status: 400 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
