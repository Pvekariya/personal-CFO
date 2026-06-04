// Next.js 16: middleware.ts is renamed to proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/forgot-password", "/onboarding", "/api/auth", "/api/onboarding"]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and static assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for session token
  // Auth.js v5 uses "authjs.session-token" in dev and "__Secure-authjs.session-token" in production (HTTPS)
  const token =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
