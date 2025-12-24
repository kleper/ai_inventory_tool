import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // If user is authenticated and tries to access root, redirect to inventory
        // This part wraps the request processing. NextAuth middleware handles the session check based on 'callbacks'.
        if (req.nextUrl.pathname === "/") {
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
        "/", // Root needs check
        "/inventory/:path*",
        "/admin/:path*",
        "/invoices/:path*",
        "/scan/:path*",
        "/profile/:path*"
    ],
}
