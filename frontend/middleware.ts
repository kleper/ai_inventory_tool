import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Define Protected Routes (Prefixes)
// Any route starting with these will require authentication
const protectedRoutes = [
    "/inventory",
    "/profile",
    "/admin",
    "/invoices",
    "/dashboard", // in case used
    "/groups"
];

// 2. Define Auth Routes
// These routes are accessible only to guests (or redirect logged in users)
const authRoutes = [
    "/login",
    "/register",
    "/auth/login",
    "/auth/register"
];

const publicRoutes = [
    "/",
    "/api/auth",
    "/api/proxy", // Allow proxying without forcing page redirect (API handles 401)
    "/_next",
    "/favicon.ico",
    "/icons",
    "/manifest.json"
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 0. Skip static files and API routes (controlled by matcher mostly, but good generic check)
    // Note: API routes might need their own auth check inside the handler, but for middleware we often let them pass 
    // or protect specific API paths. The prompt focuses on pages.
    if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.endsWith(".ico")) {
        return NextResponse.next();
    }

    // 1. Get Token
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });
    const isAuth = !!token;

    // 2. Verify Password Reset Requirement (Custom Logic)
    // If user needs to change password, lock them to that page
    const requireReset = (token as any)?.require_password_reset === true;
    const isForceChangePage = pathname === "/auth/force-change-password";

    if (isAuth && requireReset) {
        // If not already on the force-change page, redirect them there
        // Exception: Allow signout request or API calls if needed? For now, lock UI.
        if (!isForceChangePage && !pathname.startsWith("/api/auth/signout")) {
            return NextResponse.redirect(new URL("/auth/force-change-password", req.url));
        }
        // If they are on the page, allow
        if (isForceChangePage) {
            return NextResponse.next();
        }
    }

    // If they are on force-change page but DON'T need reset, kick them out
    if (isAuth && !requireReset && isForceChangePage) {
        return NextResponse.redirect(new URL("/inventory", req.url));
    }

    // 3. Handle Protected Routes (Guest Accessing Protected)
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    if (isProtectedRoute && !isAuth) {
        const loginUrl = new URL("/login", req.url);
        // Add callback URL to return after login
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Handle Auth Routes (Logged In Accessing Login)
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    if (isAuthRoute && isAuth) {
        // Redirect to dashboard/inventory
        return NextResponse.redirect(new URL("/inventory", req.url));
    }

    // 5. Handle Root Path - Optional Redirection
    if (pathname === "/" && isAuth) {
        return NextResponse.redirect(new URL("/inventory", req.url));
    }

    return NextResponse.next();
}

export const config = {
    // Precise Matcher to avoid running on static assets
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public images/icons
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
    ],
};
