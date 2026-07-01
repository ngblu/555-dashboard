import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join("/tmp", "555-store");
const DATA_FILE = join(DATA_DIR, "data.json");
const BLOB_PREFIX = "555-data";

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readTmpStore(): Record<string, unknown> | null {
  try {
    if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {}
  return null;
}

function writeTmpStore(data: Record<string, unknown>) {
  ensureDir();
  try { writeFileSync(DATA_FILE, JSON.stringify(data)); } catch {}
}

async function readBlobStore(): Promise<Record<string, unknown> | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 100 });
    if (blobs.length > 0) {
      blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const res = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) return await res.json();
    }
  } catch (e) {
    console.error("[store] blob read error:", e);
  }
  return null;
}

async function writeBlobStore(data: Record<string, unknown>): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { put, list, del } = await import("@vercel/blob");
    const fileName = `${BLOB_PREFIX}-${Date.now()}.json`;
    await put(fileName, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
    });

    // Keep only latest 3 versions
    try {
      const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 100 });
      if (blobs.length > 3) {
        blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        await del(blobs.slice(3).map(b => b.url));
      }
    } catch {}

    return true;
  } catch (e) {
    console.error("[store] blob write error:", e);
    return false;
  }
}

export async function GET() {
  try {
    const tmpData = readTmpStore();
    if (tmpData?.leads && Array.isArray(tmpData.leads) && tmpData.leads.length > 0) {
      const { _users, ...safe } = tmpData;
      writeBlobStore(tmpData).catch(() => {});
      return NextResponse.json({ configured: true, data: safe });
    }

    const blobData = await readBlobStore();
    if (blobData) {
      const { _users, ...safe } = blobData;
      writeTmpStore(blobData);
      return NextResponse.json({ configured: true, data: safe });
    }

    return NextResponse.json({ configured: true, data: { leads: [], clients: [], projects: [], tasks: [], audits: [], subscriptions: [], revenue: [] } });
  } catch {
    return NextResponse.json({ configured: true, data: { leads: [], clients: [], projects: [], tasks: [], audits: [], subscriptions: [], revenue: [] } });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const incoming = await req.json();
    const existing = readTmpStore() || {};
    const merged = { ...incoming, _users: (existing as any)?._users || [] };

    writeTmpStore(merged);
    const blobOk = await writeBlobStore(merged);

    return NextResponse.json({ saved: true, blob: blobOk });
  } catch (e) {
    return NextResponse.json({ saved: false, error: String(e) }, { status: 500 });
  }
}
