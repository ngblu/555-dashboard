import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

const BLOB_NAME = "555-data.json";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json(getDefaultData());
  } catch {
    return NextResponse.json(getDefaultData());
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    await put(BLOB_NAME, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

function getDefaultData() {
  return {
    leads: [],
    clients: [],
    projects: [],
    tasks: [],
    audits: [],
    subscriptions: [],
    revenue: [],
  };
}
