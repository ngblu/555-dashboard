import { NextRequest, NextResponse } from "next/server";
import { loadUsers, verifyToken } from "@/lib/auth";

// GET /api/auth/setup — check if users exist
export async function GET() {
  const { users } = await loadUsers();
  return NextResponse.json({
    hasUsers: users.filter((u) => u.passwordHash !== "__BOOTSTRAP__").length > 0,
    adminExists: users.some((u) => u.role === "admin"),
  });
}

// POST /api/auth/setup — no longer creates users directly (use /api/admin/users)
// Kept for backward compat — redirects to admin users API
export async function POST(req: NextRequest) {
  const { users } = await loadUsers();
  const realUsers = users.filter((u) => u.passwordHash !== "__BOOTSTRAP__");
  
  if (realUsers.length > 0) {
    const token = req.cookies.get("555-auth")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  return NextResponse.json({ error: "Use /api/admin/users to create users" }, { status: 400 });
}
