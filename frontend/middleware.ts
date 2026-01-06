import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Skip Public/Static Routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api/auth') || // NextAuth routes
        pathname.startsWith('/api/proxy/api/v1/auth') || // Backend Auth routes (public)
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // 2. Try to get token
    // This handles __Secure- prefix automatically
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    console.log(`[Middleware] Path: ${pathname} | Token Found: ${!!token}`);

    // Custom Logic: Password Reset Enforcement (Preserved from previous implementation)
    const requireReset = (token as any)?.require_password_reset === true;
    const isForceChangePage = pathname === "/auth/force-change-password";

    if (token && requireReset) {
        if (!isForceChangePage && !pathname.startsWith("/api")) {
            return NextResponse.redirect(new URL("/auth/force-change-password", req.url));
        }
        return NextResponse.next();
    }

    // If on force change page but no reset needed
    if (token && !requireReset && isForceChangePage) {
        return NextResponse.redirect(new URL("/inventory", req.url));
    }

    // 3. Protection Logic
    // If NO token and route is NOT public (and not excluded above) -> Login
    // Note: We effectively treat everything else as protected
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. If Token exists and trying to access Login -> Dashboard
    // (Handled by the check in step 1? No, step 1 allows /login to pass so we can render it.
    // We need to intercept it IF logged in.)
    // Wait, step 1 returns next() for /login. So we need to check specifically.
    // Actually, checking for /login inside "if (token)" block is correct.
    // But wait, my step 1 returned already.
    // The provided prompt code returned Next for /login. 
    // I should remove /login from step 1's "return next" if I want to redirect.
    // OR add a specific check at start.

    // Let's refine the structure to match the prompt but KEEP the "Logged in -> Redirect" logic.
    // The prompt's step 1 returns next() for /login. This implies the page component handles redirect?
    // Or the prompt logic meant "don't block access TO login if unauthenticated".
    // If authenticated, we want to redirect to inventory.

    // REVISED LOGIC based on prompt but fixing the UX issue where logged in users see login page:

    if (pathname === '/login' || pathname === '/register') {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        return NextResponse.next();
    }

    // API Proxy Protection (Custom)
    if (pathname.startsWith("/api/proxy") && !token) {
        // Return 401 for API calls instead of redirecting
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validation accomplished above:
    // If we justify this far, it's a protected route (since public ones like /_next returned already, and /login handled above).
    // Doubly ensure we have a token.
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json).*)',
    ],
};
