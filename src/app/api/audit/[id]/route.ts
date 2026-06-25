import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const STORE_DIR = join("/tmp", "555-audits");

function ensureDir() {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    ensureDir();
    const fp = join(STORE_DIR, `${id}.json`);
    if (!existsSync(fp)) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    const raw = readFileSync(fp, "utf-8");
    const audit = JSON.parse(raw);
    return NextResponse.json({ audit });
  } catch {
    return NextResponse.json({ error: "Failed to load audit" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { audit } = await req.json();
    if (!audit || !audit.id) {
      return NextResponse.json({ error: "Invalid audit data" }, { status: 400 });
    }
    ensureDir();
    const fp = join(STORE_DIR, `${audit.id}.json`);
    writeFileSync(fp, JSON.stringify(audit, null, 2));
    return NextResponse.json({ success: true, id: audit.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
