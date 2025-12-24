import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // Mock Auth for Demo (Phase 8 logic requires backend verification)
                if (credentials?.username === "admin" && credentials?.password === "admin") {
                    return { id: "1", name: "Admin User", email: "admin@example.com", role: "ADMIN" }
                }
                return null
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-secret",
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
                // We need to use internal docker network DNS if running in docker
                const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://backend:8000";
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
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session
        }
    }
}
