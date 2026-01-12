"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";

import { Suspense } from "react";

function RegisterForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const router = useRouter();

    const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        if (!token) {
            setStatus("invalid");
            return;
        }

        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
            setStatus("valid");
        } else {
            setStatus("valid");
        }
    }, [token, searchParams]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Complete Registration
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/complete-registration`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    name,
                    password
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Registration failed");
            }

            // 2. Auto Login
            const loginRes = await signIn("credentials", {
                email,
                password,
                redirect: false
            });

            if (loginRes?.error) {
                toast.error("Registration successful but login failed. Please sign in.");
                router.push("/login");
            } else {
                toast.success("Welcome aboard!");
                router.push("/inventory");
            }

        } catch (error: any) {
            toast.error(error.message);
            if (error.message.includes("expired")) {
                setStatus("expired");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (status === "invalid" || status === "expired") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <AlertCircle /> Invalid Invitation
                        </CardTitle>
                        <CardDescription className="text-red-600">
                            This invitation link is invalid or has expired. Please ask your administrator for a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => router.push("/login")}>Go to Login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
            <Card className="max-w-md w-full border border-black shadow-none rounded-none">
                <CardHeader className="border-b border-black">
                    <CardTitle className="uppercase tracking-tight font-bold text-xl">Complete Registration</CardTitle>
                    <CardDescription className="font-mono text-xs">
                        Set up your account for {email}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-100 border-2 border-dashed border-black p-3 text-sm font-mono">
                        <p className="font-bold">INVITATION ACCEPTED</p>
                        <p>Welcome! You've been invited to join the platform. Please finalize your account details below.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="uppercase font-bold">Email Address</Label>
                            <Input id="email" value={email} disabled className="bg-gray-100 border-2 border-black rounded-none cursor-not-allowed font-mono text-gray-500" />
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">This email is linked to your invitation and cannot be changed.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name" className="uppercase font-bold">Full Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Jane Doe"
                                className="border-2 border-black rounded-none focus:ring-0 focus:border-black/70 transition-all placeholder:text-gray-400"
                                required
                            />
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">This name will be displayed on your profile and team interactions.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="uppercase font-bold">Create Password</Label>
                            <div className="relative group">
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="border-2 border-black rounded-none focus:ring-0 focus:border-black/70 transition-all font-mono tracking-widest"
                                    required
                                    minLength={8}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs p-1 px-2 font-mono pointer-events-none">
                                    MIN 8 CHARS
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Must be at least 8 characters long, including letters and numbers.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="uppercase font-bold">Confirm Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="border-2 border-black rounded-none focus:ring-0 focus:border-black/70 transition-all font-mono tracking-widest"
                                required
                            />
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Re-enter your password to ensure it matches.</p>
                        </div>

                        <Button type="submit" className="w-full h-12 text-sm uppercase tracking-widest font-bold border-2 border-black bg-black text-white hover:bg-white hover:text-black rounded-none transition-colors" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Registration
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-black"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500 font-mono">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-12 border-2 border-black rounded-none text-sm uppercase tracking-widest font-bold hover:bg-gray-100 transition-colors"
                            onClick={() => signIn("google", { callbackUrl: "/inventory" })}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.17s.13-1.51.35-2.17V7.01H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.99l3.66-2.82z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.66 2.82c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}
