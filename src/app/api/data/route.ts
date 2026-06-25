import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const STORE_PREFIX = "555-cmd-store-";

export const dynamic = "force-dynamic";

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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
  if (!blobConfigured()) {
    return NextResponse.json(
      { configured: false, data: null },
      { status: 200 }
    );
  }
  try {
    const { blobs } = await list({ prefix: STORE_PREFIX, limit: 1 });
    if (blobs.length === 0) {
      return NextResponse.json({ configured: true, data: EMPTY }, { status: 200 });
    }
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return NextResponse.json({ configured: true, data }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { configured: true, data: null, error: String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { configured: false, saved: false },
      { status: 200 }
    );
  }
  try {
    const body = await req.json();
    const data = {
      leads: body.leads ?? [],
      audits: body.audits ?? [],
      clients: body.clients ?? [],
      projects: body.projects ?? [],
      tasks: body.tasks ?? [],
      revenue: body.revenue ?? [],
    };
    const key = STORE_PREFIX + Date.now() + ".json";
    await put(key, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
    });
    return NextResponse.json({ configured: true, saved: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { configured: true, saved: false, error: String(e) },
      { status: 500 }
    );
  }
}
