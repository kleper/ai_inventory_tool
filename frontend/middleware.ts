import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const isAuth = !!req.nextauth.token
        const isLoginPage = req.nextUrl.pathname === "/login"
        const isRootPage = req.nextUrl.pathname === "/"

        // Case 1: Logged in user visiting Login page -> Redirect to Inventory
        if (isAuth && isLoginPage) {
            return NextResponse.redirect(new URL("/inventory", req.url))
        }

        // Case 2: Logged in user visiting Root -> Redirect to Inventory
        // (This is redundant if page.tsx redirects, but good for safety)
        if (isAuth && isRootPage) {
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
         * - api (API routes, NextAuth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - manifest.json (PWA manifest)
         * - favicon.ico (favicon file)
         * - sw.js, workbox-*.js (Service Worker)
         */
        "/((?!api|_next/static|_next/image|manifest.json|favicon.ico|sw.js|workbox).*)",
    ],
}
