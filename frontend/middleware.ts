import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public paths that do not require authentication
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/api/auth', // NextAuth base path
    '/_next',    // Next.js internals (handled by matcher mostly, but good for safety)
    '/static',   // Static files
    '/favicon.ico',
    '/manifest.json',
    '/share',    // Public items
    '/sw.js',    // Service Worker
    '/workbox-', // Workbox scripts
    '/icons',    // Manifest icons
    '/images',   // Other public images
    '/mcp',      // Model Context Protocol endpoint (handles own auth)
    '/docs'      // Public API & MCP documentation
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Check if the path is public
    const isPublicPath = PUBLIC_PATHS.some(path =>
        pathname.startsWith(path) || pathname === path
    ) || pathname.startsWith('/api/proxy/api/v1/auth')
        || pathname.startsWith('/api/proxy/api/v1/public')
        || pathname.startsWith('/api/v1/'); // Allow direct backend API access (handled by X-API-KEY)

    // 2. Get token
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    console.log(`[Middleware] Path: ${pathname} | Token Found: ${!!token} | Public: ${isPublicPath}`);

    // 3. Handle Authenticated Users trying to access Login/Register
    if (token && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 4. Protection Logic
    if (!token && !isPublicPath) {
        // API Routes should return 401 instead of redirecting
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Redirect to login for pages
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 5. Password Reset Enforcement (Preserved Custom Logic)
    if (token) {
        const requireReset = (token as any)?.require_password_reset === true;
        const isForceChangePage = pathname === "/auth/force-change-password";

        if (requireReset) {
            if (!isForceChangePage && !pathname.startsWith("/api")) {
                return NextResponse.redirect(new URL("/auth/force-change-password", req.url));
            }
        } else if (isForceChangePage) {
            // If on force change page but no reset needed
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    // 6. Root Redirect
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Allow access
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
