import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const STORE_PREFIX = "555-cmd-store-";

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

async function getStore(): Promise<any> {
  try {
    const { blobs } = await list({ prefix: STORE_PREFIX, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return null;
  }
}

async function saveStore(data: any) {
  const key = STORE_PREFIX + Date.now() + ".json";
  await put(key, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = getStripe();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { projectId, type, amount } = session.metadata || {};

    if (projectId && type && amount) {
      console.log(`Stripe payment: ${type} of $${amount} for project ${projectId}`);

      // Update the Blob store: mark matching revenue entry as paid
      const store = await getStore();
      if (store && store.revenue) {
        // Find the most recent matching pending revenue entry for this project+type
        const updatedRevenue = store.revenue.map((r: any) => {
          if (
            r.projectId === projectId &&
            r.type === type &&
            r.status === "pending" &&
            Math.abs(r.amount - Number(amount)) < 1 // match within $1
          ) {
            return { ...r, status: "paid" };
          }
          return r;
        });

        // Only save if we actually changed something
        const changed = updatedRevenue.some((r: any) => r.status === "paid");
        if (changed) {
          store.revenue = updatedRevenue;
          try {
            await saveStore(store);
            console.log(`Marked ${type} payment as paid for project ${projectId}`);
          } catch (e) {
            console.error("Failed to save updated store:", e);
          }
        } else {
          // No matching pending entry — create one
          const now = new Date().toISOString().split("T")[0];
          store.revenue = [
            {
              id: "r_" + Date.now().toString(36),
              projectId,
              clientName: session.customer_details?.name || "",
              amount: Number(amount),
              type,
              date: now,
              status: "paid",
            },
            ...(store.revenue || []),
          ];
          try {
            await saveStore(store);
            console.log(`Created new paid revenue entry for project ${projectId}`);
          } catch (e) {
            console.error("Failed to save new revenue entry:", e);
          }
        }
      }

      return NextResponse.json({ received: true, projectId, type, amount: Number(amount) });
    }
  }

  return NextResponse.json({ received: true });
}
