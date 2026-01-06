import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        accessToken?: string
        user: {
            id?: string
            role?: string
            require_password_reset?: boolean
            accessToken?: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        access_token?: string
        require_password_reset?: boolean
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        id?: string
        role?: string
        accessToken?: string
        require_password_reset?: boolean
    }
}
