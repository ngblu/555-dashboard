import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-16.acacia" as any,
});

export async function POST(req: NextRequest) {
  try {
    const { projectId, clientName, amount, type } = await req.json();

    if (!projectId || !amount || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://555-dashboard.vercel.app";

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
            unit_amount: Math.round(amount * 100), // Stripe uses cents
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
