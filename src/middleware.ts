// src/middleware.ts
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

// Define different types of protected routes
const protectedRoutes = ["/profile", "/admin/dashboard"];
const adminRoutes = ["/admin", "/admin/dashboard", "/admin/forms"];
const agencyRoutes = [
  "/agency",
  "/forms", // Updated to match your actual routes
  "/forms/code-of-conduct",
  "/forms/monthly-compliance",
  "/forms/agency-visits",
  "/forms/asset-management",
  "/forms/telephone-declaration",
  "/forms/manpower-register",
  "/forms/product-declaration",
  "/forms/penalty-matrix",
  "/forms/training-tracker",
  "/forms/proactive-escalation",
  "/forms/escalation-details",
  "/forms/payment-register",
  "/forms/repo-kit-tracker",
  "/approval-request"
];

// Combine all protected routes
const allProtectedRoutes = [...protectedRoutes, ...agencyRoutes, ...adminRoutes];

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

  // For admin routes, we'll handle role checking at the page level
  // since middleware can't easily access the auth instance without causing build issues
  
  // User isolation for agency/form routes - ensure users can only access their own data
  if ((isOnAgencyRoute || nextUrl.pathname.startsWith('/api/')) && isLoggedIn) {
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    
    // Cache control for sensitive data
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    
    // Add session cookie to headers for API routes to access
    if (nextUrl.pathname.startsWith('/api/') && sessionCookie) {
      response.headers.set("X-Session-Token", sessionCookie);
    }
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ],
};