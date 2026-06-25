import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const STORE_KEY = "555-cmd:store-v1";

// Load the whole store server-side (used by client sync)
export async function GET() {
  try {
    const raw = await kv.get<string>(STORE_KEY);
    if (!raw) return NextResponse.json({});
    return NextResponse.json(JSON.parse(raw));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Replace the full store atomically
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await kv.set(STORE_KEY, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
