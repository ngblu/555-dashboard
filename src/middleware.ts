import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Admin-only routes
const ADMIN_ROUTES = [
  "/projects",
  "/revenue",
  "/subscriptions",
  "/tasks",
  "/clients",
  "/control",
  "/connect",
  "/emails",
  "/maintenance",
  "/admin",
];

// Routes that both admin and salesman can access
const SHARED_ROUTES = ["/sales", "/leads", "/audit"];

// Public routes (no auth needed)
const PUBLIC_ROUTES = ["/login", "/api/auth"];

// Static assets that should never be intercepted
const STATIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/icon-",
  "/manifest.json",
  "/api/bridge",
  "/api/submit-lead",
  "/api/data",
  "/api/email",
  "/api/stripe",
  "/api/audit",
  "/api/tts",
  "/api/lead-finder",
];

function isStatic(pathname: string): boolean {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((r) => pathname.startsWith(r));
}

function isSharedRoute(pathname: string): boolean {
  return SHARED_ROUTES.some((r) => pathname.startsWith(r));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never intercept static assets or API routes that don't need auth
  if (isStatic(pathname)) return NextResponse.next();

  // Allow public routes through
  if (isPublic(pathname)) return NextResponse.next();

  // Verify auth
  const token = req.cookies.get("555-auth")?.value;
  if (!token) {
    // Redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyToken(token);
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set(
      "Set-Cookie",
      "555-auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
    );
    return res;
  }

  // Role-based access control
  if (session.role === "salesman") {
    if (isAdminRoute(pathname) && pathname !== "/") {
      return NextResponse.redirect(new URL("/sales", req.url));
    }
  }
  // Managers can access sales/leads/calendar/users but not other admin routes
  if (session.role === "manager") {
    const managerAllowed = ["/sales", "/leads", "/calendar", "/admin/users", "/audit"];
    if (isAdminRoute(pathname) && !managerAllowed.some(r => pathname.startsWith(r)) && pathname !== "/") {
      return NextResponse.redirect(new URL("/sales", req.url));
    }
  }

  // If logged in and trying to access /login, redirect to appropriate dashboard
  if (pathname === "/login") {
    const target = session.role === "salesman" ? "/sales" : "/";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
