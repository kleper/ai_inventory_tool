"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Mail } from "lucide-react";

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

    const { data: users, error, mutate } = useSWR<User[]>(
        API_BASE_URL + "/api/v1/admin/users",
        fetcher
    );

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setIsInviting(true);

        try {
            const res = await fetch(API_BASE_URL + "/api/v1/admin/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage users and access control.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                    Phase 9: AI Telemetry
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg mb-8 w-fit">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "overview"
                        ? "bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Analytics
                </button>
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "users"
                        ? "bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    <Users className="w-4 h-4" /> Users
                </button>
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "audit"
                        ? "bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <UserPlus className="w-5 h-5 text-indigo-600" />
                                    <h2 className="text-xl font-semibold">Invite User</h2>
                                </div>
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-700"
                                            placeholder="colleague@company.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        disabled={isInviting}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Send Invitation
                                    </button>
                                </form>
                            </div>

                            {/* Statistics / Overview placeholder */}
                            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    <h2 className="text-xl font-semibold">System Status</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                        <span className="text-sm font-medium">Total Users</span>
                                        <span className="text-2xl font-bold">{users?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                                        <span className="text-sm font-medium">Active Sessions</span>
                                        <span className="text-green-600 font-bold">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="mt-8 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
                                <h3 className="font-semibold text-lg">Registered Users</h3>
                            </div>
                            {(!users && !error) ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-neutral-800">
                                            <tr>
                                                <th className="px-6 py-3">ID</th>
                                                <th className="px-6 py-3">Email</th>
                                                <th className="px-6 py-3">Role</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users?.map((user) => (
                                                <tr key={user.id} className="border-b dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                    <td className="px-6 py-4 font-medium">{user.id}</td>
                                                    <td className="px-6 py-4">{user.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-red-600 hover:text-red-800 font-medium">Ban</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users?.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
