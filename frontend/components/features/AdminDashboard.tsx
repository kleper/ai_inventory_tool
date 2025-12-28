"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Mail } from "lucide-react";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";

// Fetcher function removed in favor of hook

interface User {
    id: number;
    email: string;
    role: string;
    status: string;
}

import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { AuditLog } from "@/components/admin/AuditLog";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { LayoutDashboard, Users, FileText } from "lucide-react";

export default function AdminDashboard() {
    // Safely call useSession, handling potential undefined return during build/test
    const sessionData = useSession();
    const session = sessionData?.data;
    const status = sessionData?.status;

    const router = useRouter();
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit">("overview");

    // Redirect if not admin
    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
            // Uncomment in production: router.push("/");
            toast.warning("Access restricted to Admins.");
        }
    }, [status, session, router]);

    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;

    const { data: users, error, mutate } = useSWR<User[]>(
        token ? API_BASE_URL + "/api/v1/admin/users" : null,
        fetcher
    );

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setIsInviting(true);

        try {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(API_BASE_URL + "/api/v1/admin/invitations", {
                method: "POST",
                headers,
                body: JSON.stringify({ email: inviteEmail })
            });

            if (!res.ok) throw new Error("Failed to invite");

            toast.success("Invitation sent to " + inviteEmail);
            setInviteEmail("");
        } catch (err) {
            toast.error("Error creating invitation");
        } finally {
            setIsInviting(false);
        }
    };

    if (status === "loading") return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 max-w-6xl min-h-screen">
            <div className="flex items-center justify-between mb-8 border-b-[3px] border-white pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Admin Dashboard</h1>
                    <p className="text-primary font-mono text-xs uppercase tracking-[0.2em]">Manage users and access control.</p>
                </div>
                <div className="bg-primary text-black px-4 py-1 text-xs font-bold border-2 border-white shadow-brutal-sm uppercase tracking-wider">
                    Phase 9: AI Telemetry
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-0 mb-8 w-fit bg-black border-2 border-white">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all border-r-2 border-transparent ${activeTab === "overview"
                        ? "bg-white text-black border-r-black"
                        : "text-white hover:bg-neutral-900 border-r-white"
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Analytics
                </button>
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all border-r-2 border-transparent ${activeTab === "users"
                        ? "bg-white text-black border-r-black"
                        : "text-white hover:bg-neutral-900 border-r-white"
                        }`}
                >
                    <Users className="w-4 h-4" /> Users
                </button>
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === "audit"
                        ? "bg-white text-black"
                        : "text-white hover:bg-neutral-900"
                        }`}
                >
                    <FileText className="w-4 h-4" /> Audit Log
                </button>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {activeTab === "overview" && <AnalyticsDashboard />}

                {activeTab === "audit" && <AuditLog />}

                {activeTab === "users" && (
                    <>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Invite Section */}
                            <div className="bg-black border-[3px] border-white p-6 shadow-brutal">
                                <div className="flex items-center gap-2 mb-4 border-b-2 border-white pb-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-bold uppercase">Invite User</h2>
                                </div>
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1 uppercase text-primary">Email Address</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-3 py-3 border-2 border-white bg-black text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-primary focus:shadow-brutal-primary transition-all"
                                            placeholder="colleague@company.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        disabled={isInviting}
                                        className="w-full bg-primary hover:bg-primary/90 text-black border-2 border-white font-black uppercase py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-brutal-sm hover:shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px]"
                                    >
                                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Send Invitation
                                    </button>
                                </form>
                            </div>

                            {/* Statistics / Overview placeholder */}
                            <div className="bg-black border-[3px] border-white p-6 shadow-brutal">
                                <div className="flex items-center gap-2 mb-4 border-b-2 border-white pb-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-bold uppercase">System Status</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 border-2 border-white bg-black text-white">
                                        <span className="text-sm font-bold uppercase">Total Users</span>
                                        <span className="text-2xl font-black font-mono">{users?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 border-2 border-white bg-black text-white">
                                        <span className="text-sm font-bold uppercase">Active Sessions</span>
                                        <span className="text-primary font-black font-mono">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="mt-8 bg-black border-[3px] border-white shadow-brutal overflow-hidden">
                            <div className="px-6 py-4 border-b-[3px] border-white bg-neutral-900">
                                <h3 className="font-bold text-lg uppercase text-white">Registered Users</h3>
                            </div>
                            {(!users && !error) ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-white" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-black text-primary border-b-2 border-white">
                                            <tr>
                                                <th className="px-6 py-3 border-r-2 border-white font-black">ID</th>
                                                <th className="px-6 py-3 border-r-2 border-white font-black">Email</th>
                                                <th className="px-6 py-3 border-r-2 border-white font-black">Role</th>
                                                <th className="px-6 py-3 border-r-2 border-white font-black">Status</th>
                                                <th className="px-6 py-3 font-black">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-white">
                                            {Array.isArray(users) && users.map((user) => (
                                                <tr key={user.id} className="hover:bg-neutral-900 text-white font-mono">
                                                    <td className="px-6 py-4 font-bold border-r-2 border-white">{user.id}</td>
                                                    <td className="px-6 py-4 border-r-2 border-white">{user.email}</td>
                                                    <td className="px-6 py-4 border-r-2 border-white">
                                                        <span className={`px-2 py-1 text-xs font-bold uppercase border border-white ${user.role === 'ADMIN' ? 'bg-primary text-black' : 'bg-black text-white'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 border-r-2 border-white">
                                                        <span className={`px-2 py-1 text-xs font-bold uppercase border border-white ${user.status === 'ACTIVE' ? 'bg-white text-black' : 'bg-neutral-800 text-white'}`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-red-500 hover:text-white hover:bg-red-600 border border-red-500 px-2 py-1 text-xs font-bold uppercase transition-colors">Ban</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users?.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-white border-dashed">
                                                        No users found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
