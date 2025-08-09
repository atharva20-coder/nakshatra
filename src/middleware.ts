// src/middleware.ts
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

// Define different types of protected routes
const protectedRoutes = ["/profile", "/admin/dashboard"];
const agencyRoutes = [
  "/agency",
  "/agency/visit-details", 
  "/agency/code-of-conduct",
  "/agency/declaration-cum-undertaking",
  "/agency/declaration-of-product",
  "/agency/monthly-compliance-declaration",
  "/agency/asset-management-declaration",
  "/agency/telephone-lines-declaration",
  "/agency/manpower-register",
  "/agency/penalty-matrix",
  "/agency/training-tracker",
  "/agency/proactive-escalation-management",
  "/agency/escalation-details",
  "/agency/payment-register",
  "/agency/repo-kit-tracker"
];

// Combine all protected routes
const allProtectedRoutes = [...protectedRoutes, ...agencyRoutes];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const sessionCookie = getSessionCookie(req);

  const isLoggedIn = !!sessionCookie;
  const isOnProtectedRoute = allProtectedRoutes.some(route => 
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  );
  const isOnAuthRoute = nextUrl.pathname.startsWith("/auth");
  const isOnAgencyRoute = agencyRoutes.some(route => 
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  );

  // Redirect to login if trying to access protected routes without authentication
  if (isOnProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.url);
    // Add a return URL parameter so user can be redirected back after login
    loginUrl.searchParams.set("returnUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isOnAuthRoute && isLoggedIn) {
    // Check if there's a return URL
    const returnUrl = nextUrl.searchParams.get("returnUrl");
    if (returnUrl && allProtectedRoutes.some(route => returnUrl.startsWith(route))) {
      return NextResponse.redirect(new URL(returnUrl, req.url));
    }
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  // Add security headers for agency routes
  if (isOnAgencyRoute && isLoggedIn) {
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Cache control for sensitive data
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ],
};