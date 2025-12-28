"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Mail, LayoutDashboard, Users, FileText } from "lucide-react";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { AuditLog } from "@/components/admin/AuditLog";
import { API_BASE_URL } from "@/lib/config";
import { PendingInvitationsTable } from "@/components/admin/PendingInvitationsTable";

interface User {
    id: number;
    email: string;
    role: string;
    status: string;
}

export default function AdminDashboard() {
    const sessionData = useSession();
    const session = sessionData?.data;
    const status = sessionData?.status;

    const router = useRouter();
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit" | "pending">("overview");

    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
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
        <div className="container mx-auto p-6 max-w-6xl min-h-screen bg-white text-black">
            <div className="flex items-center justify-between mb-8 border-b border-black pb-6">
                <div>
                    <h1 className="text-4xl font-medium tracking-tight uppercase text-black">Admin Dashboard</h1>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">Manage users and access control.</p>
                </div>
                <div className="bg-black text-white px-4 py-1 text-xs font-bold border border-black uppercase tracking-wider">
                    Phase 9: AI Telemetry
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-0 mb-8 w-fit bg-white border border-black">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all border-r border-transparent ${activeTab === "overview"
                        ? "bg-black text-white border-r-black"
                        : "text-black hover:bg-neutral-100 border-r-black"
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Analytics
                </button>

                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all border-r border-transparent ${activeTab === "users"
                        ? "bg-black text-white border-r-black"
                        : "text-black hover:bg-neutral-100 border-r-black"
                        }`}
                >
                    <Users className="w-4 h-4" /> Active Users
                </button>
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all border-r border-transparent ${activeTab === "pending"
                        ? "bg-black text-white border-r-black"
                        : "text-black hover:bg-neutral-100 border-r-black"
                        }`}
                >
                    <Mail className="w-4 h-4" /> Pending Invites
                </button>
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === "audit"
                        ? "bg-black text-white"
                        : "text-black hover:bg-neutral-100"
                        }`}
                >
                    <FileText className="w-4 h-4" /> Audit Log
                </button>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {activeTab === "overview" && <AnalyticsDashboard />}
                {activeTab === "audit" && <AuditLog />}
                {activeTab === "pending" && <PendingInvitationsTable />}
                {activeTab === "users" && (
                    <>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Invite Section */}
                            <div className="bg-white border border-black p-6">
                                <div className="flex items-center gap-2 mb-4 border-b border-black pb-2">
                                    <UserPlus className="w-5 h-5 text-black" />
                                    <h2 className="text-xl font-bold uppercase">Invite User</h2>
                                </div>
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1 uppercase text-black">Email Address</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-3 py-3 border border-black bg-white text-black font-mono placeholder:text-neutral-400 focus:outline-none focus:bg-neutral-50 transition-all"
                                            placeholder="colleague@company.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        disabled={isInviting}
                                        className="w-full bg-black hover:bg-neutral-800 text-white border border-black font-bold uppercase py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Send Invitation
                                    </button>
                                </form>
                            </div>

                            {/* Statistics / Overview placeholder */}
                            <div className="bg-white border border-black p-6">
                                <div className="flex items-center gap-2 mb-4 border-b border-black pb-2">
                                    <Shield className="w-5 h-5 text-black" />
                                    <h2 className="text-xl font-bold uppercase">System Status</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 border border-black bg-white text-black">
                                        <span className="text-sm font-bold uppercase">Total Users</span>
                                        <span className="text-2xl font-black font-mono">{users?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 border border-black bg-white text-black">
                                        <span className="text-sm font-bold uppercase">Active Sessions</span>
                                        <span className="text-black font-black font-mono">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="mt-8 bg-white border border-black overflow-hidden">
                            <div className="px-6 py-4 border-b border-black bg-neutral-100">
                                <h3 className="font-bold text-lg uppercase text-black">Registered Users</h3>
                            </div>
                            {(!users && !error) ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-black" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-black">
                                        <thead className="text-xs uppercase bg-white text-black border-b border-black">
                                            <tr>
                                                <th className="px-6 py-3 border-r border-black font-bold">ID</th>
                                                <th className="px-6 py-3 border-r border-black font-bold">Email</th>
                                                <th className="px-6 py-3 border-r border-black font-bold">Role</th>
                                                <th className="px-6 py-3 border-r border-black font-bold">Status</th>
                                                <th className="px-6 py-3 font-bold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black">
                                            {Array.isArray(users) && users.map((user) => (
                                                <tr key={user.id} className="hover:bg-neutral-50 text-black font-mono">
                                                    <td className="px-6 py-4 font-bold border-r border-black">{user.id}</td>
                                                    <td className="px-6 py-4 border-r border-black">{user.email}</td>
                                                    <td className="px-6 py-4 border-r border-black">
                                                        <span className={`px-2 py-1 text-xs font-bold uppercase border border-black ${user.role === 'ADMIN' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-black">
                                                        <span className={`px-2 py-1 text-xs font-bold uppercase border border-black ${user.status === 'ACTIVE' ? 'bg-black text-white' : 'bg-neutral-200 text-black'}`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-red-600 hover:text-white hover:bg-red-600 border border-red-600 px-2 py-1 text-xs font-bold uppercase transition-colors">Ban</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users?.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-black border-dashed">
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
