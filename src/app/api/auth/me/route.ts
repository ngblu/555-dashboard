import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("555-auth")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await verifyToken(token);
  if (!session) {
    const res = NextResponse.json({ user: null }, { status: 401 });
    res.headers.set(
      "Set-Cookie",
      "555-auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
    );
    return res;
  }

  return NextResponse.json({
    user: {
      sub: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
      area: session.area,
    },
  });
}
