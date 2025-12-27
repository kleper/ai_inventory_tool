import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const isAuth = !!req.nextauth.token
        const isLoginPage = req.nextUrl.pathname === "/login"
        const isRootPage = req.nextUrl.pathname === "/"
        const isRegisterPage = req.nextUrl.pathname.startsWith("/register")
        const isForceChangePage = req.nextUrl.pathname === "/auth/force-change-password"

        // Case 1: Logged in user visiting Login page -> Redirect to Inventory
        if (isAuth && (isLoginPage || isRegisterPage)) {
            // But if force change is required, send them there
            if ((req.nextauth.token as any)?.require_password_reset) {
                if (!isForceChangePage) {
                    return NextResponse.redirect(new URL("/auth/force-change-password", req.url))
                }
                return NextResponse.next()
            }
            return NextResponse.redirect(new URL("/inventory", req.url))
        }

        // Case 2: Logged in user visiting Root -> Redirect to Inventory
        if (isAuth && isRootPage) {
            if ((req.nextauth.token as any)?.require_password_reset) {
                return NextResponse.redirect(new URL("/auth/force-change-password", req.url))
            }
            return NextResponse.redirect(new URL("/inventory", req.url))
        }

        // Case 3: Enforce Password Reset
        if (isAuth && (req.nextauth.token as any)?.require_password_reset) {
            if (!isForceChangePage) {
                return NextResponse.redirect(new URL("/auth/force-change-password", req.url))
            }
        }
        // If on Force Change page but NOT required, redirect to inventory
        if (isAuth && isForceChangePage && !(req.nextauth.token as any)?.require_password_reset) {
            return NextResponse.redirect(new URL("/inventory", req.url))
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes need to be public initially for signin)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - manifest.json (PWA manifest)
         * - favicon.ico (favicon file)
         * - sw.js, workbox-*.js (Service Worker)
         * - login (Login page needs to be public)
         * - register (If we had one)
         */
        "/((?!api/auth|_next/static|_next/image|manifest.json|favicon.ico|sw.js|workbox|login|icons).*)",
    ],
}
