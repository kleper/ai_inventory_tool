"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";

export default function ForceChangePasswordPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            // Need token for auth. useSession handles it seamlessly in client component 
            // if we use a proxy or if we send the token. 
            // BUT here we are calling backend directly.
            // Client side `fetch` does NOT automatically attach NextAuth session cookie to cross-domain backend calls 
            // unless backend is same domain or proxy.
            // In our `auth.ts`, we used `process.env.INTERNAL_API_URL` (server side).
            // Here we are client side. We must send `Authorization: Bearer ...` BUT NextAuth doesn't expose the raw JWT easily 
            // in the session object unless we put it there.
            // In `auth.ts`, we put `id` in session. but not the accessToken (JWT).
            // Credentials provider doesn't usually give an access token unless backend returns one.
            // Backend `login` returned user info, not a token.
            // Wait, this is a problem. How does the frontend authenticate with the backend?
            // Existing `process_object` uses `Depends(get_current_user)`.
            // How does `get_current_user` validate?
            // It likely looks for a Bearer token.
            // If I haven't implemented JWT generation in `login`, then `get_current_user` will fail!
            // I need to check `app.dependencies.auth.get_current_user`.
            // If it expects a JWT, I MUST return a JWT from `login` and store it in NextAuth session.

            // For this specific task, I'll assume I need to pass the Token. 
            // I'll grab the `accessToken` from session if available.

            // Actually, the `SecureImage` component used `(session as any)?.accessToken`.
            // So I should assume `accessToken` is there?
            // Let's check `auth.ts` again.
            // `jwt` callback returns `token`. `session` callback returns `session`.
            // I did NOT put `accessToken` into session in my previous edits.
            // I should fix `auth.ts` to include `accessToken` if it exists.

            // BUT `login` endpoint returned a dict: `{ id, email ... }`. It did NOT return a token.
            // This means `CredentialsProvider` sees `user` object.
            // The `jwt` callback receives `user`.
            // I need `login` to return a token too!
            // AND I need `auth.ts` to persist it.

            // Re-evaluating: The system must use JWTs.
            // I need to update `login` to generate a token.

            // For now, I will write the component assuming `accessToken` is in the session.
            // I will then go back and update `login` and `auth.ts`.

            const token = (session as any)?.accessToken; // I will ensure this exists.

            const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to change password");
            }

            toast.success("Password changed successfully");
            // Force re-login or reload session to clear the flag
            // Reloading session is cleaner.
            // Or better: Redirect to inventory?
            // The middleware checks the flag in the token.
            // We need to refresh the token. `update()` from useSession might triggers jwt callback?
            // `router.refresh()` refreshes server components.
            // `signIn` again updates session?
            // Simply signing out is safest to ensure token is refreshed.
            toast.info("Please sign in with your new password");
            await signOut({ callbackUrl: "/login" });

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
            <Card className="max-w-md w-full border border-black shadow-none rounded-none">
                <CardHeader className="border-b border-black">
                    <CardTitle className="flex items-center gap-2 uppercase tracking-tight font-bold text-xl text-black">
                        <Lock className="w-5 h-5" /> Change Password Required
                    </CardTitle>
                    <CardDescription className="text-neutral-500 font-mono text-xs">
                        For your security, you must change your password before proceeding.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="old" className="text-black uppercase tracking-wide font-bold text-xs">Current Password</Label>
                            <Input
                                id="old"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className="border-black rounded-none shadow-none focus:ring-0 focus:border-black"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new" className="text-black uppercase tracking-wide font-bold text-xs">New Password</Label>
                            <Input
                                id="new"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                className="border-black rounded-none shadow-none focus:ring-0 focus:border-black"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-black uppercase tracking-wide font-bold text-xs">Confirm New Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="border-black rounded-none shadow-none focus:ring-0 focus:border-black"
                            />
                        </div>
                        <Button type="submit" className="w-full bg-black text-white rounded-none uppercase font-bold tracking-wide border border-black hover:bg-neutral-800" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                        <div className="text-center">
                            <Button type="button" variant="link" size="sm" onClick={() => signOut()} className="text-black uppercase font-bold text-xs tracking-wide">
                                Sign Out
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
