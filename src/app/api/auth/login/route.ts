import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, signToken, setAuthCookie, hashPassword, createUser } from "@/lib/auth";
import type { UserSession } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    // Bootstrap admin (no hash stored — check ADMIN_PASSWORD env var directly)
    if (user && user.passwordHash === "__BOOTSTRAP__") {
      const adminPw = process.env.ADMIN_PASSWORD;
      if (adminPw && password === adminPw) {
        // Persist the admin with a real hash so future logins are fast
        const hash = await hashPassword(password);
        try { await createUser({ email: user.email, name: user.name, role: user.role, passwordHash: hash, active: true }); } catch {}
        const fresh = await getUserByEmail(email);
        if (fresh && fresh.active) return makeResponse(fresh);
      }
    }

    // Normal user
    if (user && user.active && user.passwordHash !== "__BOOTSTRAP__") {
      const valid = await verifyPassword(password, user.passwordHash);
      if (valid) return makeResponse(user);
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function makeResponse(user: { id: string; email: string; name: string; role: "admin" | "salesman" | "manager"; area?: string }) {
  const session: UserSession = { sub: user.id, email: user.email, name: user.name, role: user.role, area: user.area };
  const token = await signToken(session);
  const res = NextResponse.json({ user: session });
  res.headers.set("Set-Cookie", setAuthCookie(token));
  return res;
}
