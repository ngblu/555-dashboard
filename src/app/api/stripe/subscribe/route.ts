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

async function getOrCreatePrice(stripe: any) {
  // Check if price ID is in env
  if (process.env.STRIPE_MAINTENANCE_PRICE_ID) {
    return process.env.STRIPE_MAINTENANCE_PRICE_ID;
  }

  // Search for existing product
  const products = await stripe.products.search({
    query: "name:'555 Digital Maintenance'",
    limit: 1,
  });

  let product;
  if (products.data.length > 0) {
    product = products.data[0];
  } else {
    product = await stripe.products.create({
      name: "555 Digital Maintenance",
      description: "Monthly website maintenance, updates, and support",
    });
  }

  // Search for existing price on this product
  const prices = await stripe.prices.list({
    product: product.id,
    recurring: { interval: "month" },
    limit: 1,
  });

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  // Create the price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 9900, // $99.00
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { type: "maintenance" },
  });

  return price.id;
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  try {
    const { clientName, clientEmail } = await req.json();
    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://555-dashboard.vercel.app";

    const priceId = await getOrCreatePrice(stripe);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          clientName: clientName || "",
        },
      },
      customer_email: clientEmail || undefined,
      success_url: `${origin}/maintenance?subscribed=1`,
      cancel_url: `${origin}/maintenance`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Subscription checkout error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
