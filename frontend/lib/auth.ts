import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    debug: true, // Enable NextAuth debugging
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // Support both username and email fields from client
                const userIdentifier = credentials?.username || credentials?.email;
                const password = credentials?.password;

                if (!userIdentifier || !password) return null;

                try {
                    // Use internal docker network alias if on server side
                    // Authorize runs on server side.
                    const backendUrl = process.env.INTERNAL_API_URL || "http://backend:8000";
                    console.log(`[AUTH-DEBUG] Connecting to backend auth at: ${backendUrl}`);
                    console.log(`[AUTH-DEBUG] Attempting login for: ${userIdentifier}`);

                    const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            email: userIdentifier, // NextAuth default field is username
                            password: password
                        }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const user = await res.json();

                    // If no error and we have user data, return it
                    if (res.ok && user) {
                        return user;
                    }
                    console.warn("Backend auth failed:", user);
                    return null;
                } catch (e) {
                    console.error("Auth error:", e);
                    return null;
                }
            }
        }),
        GoogleProvider({
            clientId: (() => {
                if (!process.env.GOOGLE_CLIENT_ID) {
                    console.error("❌ Critical: GOOGLE_CLIENT_ID is missing from environment variables.");
                    // Return empty string to prevent crash at build time, but it will fail at runtime if used
                    if (process.env.NODE_ENV === 'development') return "mock-id-dev-only";
                    throw new Error("GOOGLE_CLIENT_ID is missing");
                }
                return process.env.GOOGLE_CLIENT_ID;
            })(),
            clientSecret: (() => {
                if (!process.env.GOOGLE_CLIENT_SECRET) {
                    console.error("❌ Critical: GOOGLE_CLIENT_SECRET is missing from environment variables.");
                    if (process.env.NODE_ENV === 'development') return "mock-secret-dev-only";
                    throw new Error("GOOGLE_CLIENT_SECRET is missing");
                }
                return process.env.GOOGLE_CLIENT_SECRET;
            })(),
            allowDangerousEmailAccountLinking: true,
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Check invitation via Backend API
            // Skip for Mock Admin Credential login
            if (account?.provider === "credentials") return true;

            try {
                // Backend is at http://backend:8000 internal docker network
                // But NextAuth runs on Server side in frontend container.
                // Use internal docker network DNS if running in docker
                const backendUrl = process.env.INTERNAL_API_URL || "http://backend:8000";
                const res = await fetch(`${backendUrl}/api/v1/auth/validate-registration`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: user.email })
                });

                if (res.ok) {
                    return true;
                } else {
                    console.log("Blocking sign in:", await res.text());
                    return false; // Blocks sign in
                }
            } catch (error) {
                console.error("Error validating registration:", error);
                return false;
            }
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.require_password_reset = (user as any).require_password_reset;
                token.accessToken = (user as any).access_token;
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).require_password_reset = token.require_password_reset;
                (session.user as any).accessToken = token.accessToken;
            }
            // Expose access token on session root as well for compatibility
            (session as any).accessToken = token.accessToken;
            return session
        }
    }
}
