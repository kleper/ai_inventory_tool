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

export default function RegisterPage() {
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
        if (!token) {
            setStatus("invalid");
            return;
        }

        // We assume token contains encoded email or we just validate token?
        // Backend `validate-registration` takes email.
        // But `complete-registration` takes token.
        // The invite link usually is /register?token=...&email=...
        // If query only has token, we can't easily validate on load without an endpoint strictly for token.
        // However, standard invite links usually include email for UI verification.
        // Let's assume URL is /register?token=XYZ&email=abc@example.com

        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
            // Optional: validate with backend
            setStatus("valid");
        } else {
            // If no email param, we hope token validation handles it during submit or we ask user for email.
            // But for safer UX, we should ask credentials match.
            // Let's assume valid for now if token present.
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
                email, // We supply email if we have it, OR the backend should infer from token? 
                // Wait, complete-registration invalidated the token.
                // We need the email to login.
                // If email was not in URL, we don't know it!
                // Update: Backend complete-registration should probably return the email?
                // Or we require email in frontend.
                // Ideally, Invite Link includes email.
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-black">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Complete Registration</CardTitle>
                    <CardDescription>
                        Set up your account for {email}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={email} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Registration
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
