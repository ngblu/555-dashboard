import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Single-user command center: the whole dashboard is one JSON blob.
const STORE_KEY = "555-cmd-store-v1";

export const dynamic = "force-dynamic";

// Is KV wired up? (env vars injected by the Vercel KV/Upstash integration)
function kvConfigured() {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

const EMPTY = {
  leads: [],
  audits: [],
  clients: [],
  projects: [],
  tasks: [],
  revenue: [],
};

export async function GET() {
  if (!kvConfigured()) {
    // KV not provisioned yet — tell the client to stay in local-only mode.
    return NextResponse.json(
      { configured: false, data: null },
      { status: 200 }
    );
  }
  try {
    const data = (await kv.get(STORE_KEY)) ?? EMPTY;
    return NextResponse.json({ configured: true, data }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { configured: true, data: null, error: String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(
      { configured: false, saved: false },
      { status: 200 }
    );
  }
  try {
    const body = await req.json();
    // Basic shape guard — only persist known collections.
    const data = {
      leads: body.leads ?? [],
      audits: body.audits ?? [],
      clients: body.clients ?? [],
      projects: body.projects ?? [],
      tasks: body.tasks ?? [],
      revenue: body.revenue ?? [],
    };
    await kv.set(STORE_KEY, data);
    return NextResponse.json({ configured: true, saved: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { configured: true, saved: false, error: String(e) },
      { status: 500 }
    );
  }
}
