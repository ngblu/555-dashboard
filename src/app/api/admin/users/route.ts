import { NextRequest, NextResponse } from "next/server";
import { loadUsers, createUser, deleteUser, hashPassword, reloadUsersFromEnv } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // ?reload=true forces refresh from env var + blob
    if (searchParams.get("reload") === "true") {
      const { users } = await reloadUsersFromEnv();
      const safe = users.filter((u) => u.passwordHash !== "__BOOTSTRAP__").map(({ passwordHash, ...u }) => u);
      return NextResponse.json({ users: safe, reloaded: true });
    }
    const { users } = await loadUsers();
    const safe = users.filter((u) => u.passwordHash !== "__BOOTSTRAP__").map(({ passwordHash, ...u }) => u);
    return NextResponse.json({ users: safe });
  } catch (e) {
    console.error("admin users GET:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, area } = await req.json();
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Email, password, name, and role required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!["admin", "salesman", "manager"].includes(role)) {
      return NextResponse.json({ error: "Role must be admin, salesman, or manager" }, { status: 400 });
    }
    const hash = await hashPassword(password);
    const user = await createUser({ email: email.toLowerCase().trim(), name: name.trim(), role, passwordHash: hash, active: true, area: area || undefined });
    return NextResponse.json({ user: { ...user, passwordHash: user.passwordHash } });
  } catch (e: any) {
    if (e.message === "User already exists") {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }
    console.error("admin users POST:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });
    const { users } = await loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === "admin" && users.filter((u) => u.role === "admin" && u.id !== userId).length === 0) {
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
    }
    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin users DELETE:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
