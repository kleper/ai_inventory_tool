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
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-md bg-white border border-black p-8 space-y-8 shadow-none">
                {/* Header */}
                <div className="space-y-2 text-center border-b border-black pb-6">
                    <h1 className="text-3xl font-medium tracking-tight uppercase text-black">Access Control</h1>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">System Secured // Login Required</p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setActiveTab("google")}
                        className={`py-3 text-sm font-medium uppercase tracking-wide border transition-all ${activeTab === "google"
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-neutral-50"
                            }`}
                    >
                        Google
                    </button>
                    <button
                        onClick={() => setActiveTab("credentials")}
                        className={`py-3 text-sm font-bold uppercase tracking-wide border transition-all ${activeTab === "credentials"
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-neutral-50"
                            }`}
                    >
                        Password
                    </button>
                </div>

                <div className="min-h-[200px]">
                    {activeTab === "google" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="bg-neutral-50 border border-black/10 p-4 text-xs font-mono text-neutral-500 mb-6">
                                <span className="text-black mr-2">root@system:~$</span>
                                Authenticate via OAuth provider to proceed with session initialization...
                            </div>
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white text-black border border-black h-12 font-bold uppercase tracking-wide hover:bg-neutral-100 transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                                Initialize Session
                            </button>
                        </div>
                    )}

                    {activeTab === "credentials" && (
                        <form onSubmit={handleCredentialsLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-black uppercase tracking-widest">User ID / Email</label>
                                    <input
                                        type="email"
                                        placeholder="OPERATOR_EMAIL"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full h-10 bg-white text-black border border-black px-4 font-mono focus:outline-none focus:bg-neutral-50"
                                        required
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-black uppercase tracking-widest">Access Key</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full h-10 bg-white text-black border border-black px-4 font-mono focus:outline-none focus:bg-neutral-50"
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-black text-white h-12 border border-black font-bold uppercase tracking-wide hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                                Authenticate
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
