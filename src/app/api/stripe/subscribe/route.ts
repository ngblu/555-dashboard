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
      { error: "Stripe not configured. Add STRIPE_SECRET_KEY to Vercel env vars." },
      { status: 503 }
    );
  }

  try {
    const { clientName, clientEmail, plan, amount } = await req.json();
    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://555-dashboard.vercel.app";
    const unitAmount = Math.round((amount || 99) * 100); // Convert dollars to cents

    // Create a product for this subscription if needed
    const productName = plan || "555 Digital Maintenance";
    let product;
    const products = await stripe.products.search({
      query: `name:'${productName}'`,
      limit: 1,
    });
    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: productName,
        description: `Monthly ${productName.toLowerCase()} plan`,
      });
    }

    // Check for existing price at this exact amount
    let priceId;
    const prices = await stripe.prices.list({
      product: product.id,
      recurring: { interval: "month" },
      limit: 100,
    });
    const existingPrice = prices.data.find((p: any) => p.unit_amount === unitAmount);
    if (existingPrice) {
      priceId = existingPrice.id;
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { type: "maintenance", plan: productName },
      });
      priceId = price.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { clientName: clientName || "", plan: productName, amount: String(amount) },
      },
      customer_email: clientEmail || undefined,
      success_url: `${origin}/subscriptions?subscribed=1`,
      cancel_url: `${origin}/subscriptions`,
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
