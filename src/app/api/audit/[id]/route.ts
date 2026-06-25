import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

const BLOB_NAME = "555-data.json";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    const audit = data.audits?.find((a: { id: string }) => a.id === id);
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    return NextResponse.json({ audit });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve audit" }, { status: 500 });
  }
}
