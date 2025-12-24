"use client";

import { useState } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, UserPlus, X } from "lucide-react";

interface ShareModalProps {
    group: { id: number; name: string };
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ group, isOpen, onClose }: ShareModalProps) {
    const [email, setEmail] = useState("");
    const [permission, setPermission] = useState("VIEWER");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/groups/${group.id}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, permission })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to share group");
            }

            toast.success(`Group shared with ${email}`);
            setEmail("");
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-md p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 relative animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg dark:bg-indigo-900/30">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Share Group</h2>
                        <p className="text-sm text-gray-500">Invite others to "{group.name}"</p>
                    </div>
                </div>

                <form onSubmit={handleShare} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="collaborator@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Permission</label>
                        <select
                            value={permission}
                            onChange={(e) => setPermission(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="VIEWER">Viewer (Read Only)</option>
                            <option value="EDITOR">Editor (Can Upload/Edit)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Send Invite
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
