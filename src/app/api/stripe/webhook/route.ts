import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-16.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { projectId, type, amount } = session.metadata || {};

    if (projectId && type && amount) {
      console.log(
        `Payment received: ${type} of $${amount} for project ${projectId}`
      );

      // The client store will sync this on next poll
      // We return the data so the client can also handle it via success_url redirect
      return NextResponse.json({
        received: true,
        projectId,
        type,
        amount: Number(amount),
      });
    }
  }

  return NextResponse.json({ received: true });
}
