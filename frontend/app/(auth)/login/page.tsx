"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [activeTab, setActiveTab] = useState<"credentials" | "google">("google")

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        await signIn("google", { callbackUrl: "/inventory" })
    }

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        if (res?.error) {
            // Check if we need to redirect due to Force Change password?
            // Auth.ts returns error? Or SignIn returns success but callback url handles it?
            // Credentials provider login returns success if user valid.
            // If failure, we show alert.
            // If Success, valid response.
            // Middleware handles redirection if "require_password_reset" is set.
            alert("Invalid credentials or access denied")
            setIsLoading(false)
        } else {
            // Let middleware handle routing based on session state
            // We just push to inventory, middleware intercepts if needed.
            // OR router.refresh() to update session state?
            router.push("/inventory")
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-gray-500 text-sm">Sign in to your account</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                <button
                    onClick={() => setActiveTab("google")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "google"
                            ? "bg-white dark:bg-black shadow-sm text-foreground"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    Google
                </button>
                <button
                    onClick={() => setActiveTab("credentials")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "credentials"
                            ? "bg-white dark:bg-black shadow-sm text-foreground"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    Email & Password
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === "google" && (
                    <div className="py-4 space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            Continue with Google
                        </button>
                        <p className="text-xs text-center text-muted-foreground">
                            Use your Google Account for quick access.
                        </p>
                    </div>
                )}

                {activeTab === "credentials" && (
                    <form onSubmit={handleCredentialsLogin} className="space-y-4 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />

                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Sign In
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
