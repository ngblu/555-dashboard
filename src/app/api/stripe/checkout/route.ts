import { NextRequest, NextResponse } from "next/server";

let _stripe: any = null;
function getStripe() {
  if (!_stripe) {
    const Stripe = require("stripe");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured — add STRIPE_SECRET_KEY to Vercel env" },
      { status: 503 }
    );
  }

  try {
    const { projectId, clientName, amount, type } = await req.json();

    if (!projectId || !amount || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://555-dashboard.vercel.app";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `555 Digital — ${type === "deposit" ? "Deposit" : "Final Payment"}`,
              description: clientName || "Website project",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        projectId,
        type,
        amount: String(amount),
      },
      success_url: `${origin}/projects?paid=1`,
      cancel_url: `${origin}/projects?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json(
      { error: e.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
