import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/cron/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based path protection
  const role = session.role;
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (pathname.startsWith("/counsellor") && role !== "COUNSELLOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (pathname.startsWith("/reception") && role !== "RECEPTIONIST" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Prevent browser / CDN from caching protected pages so a stale
  // response from a previous session is never replayed.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
