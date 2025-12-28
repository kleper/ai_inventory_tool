"use client";

import { useState } from "react";
import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/config';
import { Plus, Users, Loader2, Folder } from "lucide-react";
import { toast } from "sonner";
import { ShareModal } from "./ShareModal";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Group {
    id: number;
    name: string;
    owner_id: number;
}

interface GroupManagerProps {
    activeGroupId: number | null;
    onGroupSelect: (id: number | null) => void;
}

export function GroupManager({ activeGroupId, onGroupSelect }: GroupManagerProps) {
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;

    // Only fetch if authenticated
    const { data: groups, mutate } = useSWR<Group[]>(
        token ? `${API_BASE_URL}/api/v1/groups` : null,
        fetcher
    );
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [groupToShare, setGroupToShare] = useState<Group | null>(null);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName) return;

        try {
            const token = (session as any)?.accessToken;
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/api/v1/groups`, {
                method: "POST",
                headers,
                body: JSON.stringify({ name: newGroupName })
            });

            if (!res.ok) throw new Error("Failed to create group");

            mutate();
            setNewGroupName("");
            setIsCreating(false);
            toast.success("Group created");
        } catch (error) {
            toast.error("Error creating group");
        }
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Folder className="w-5 h-5 text-gray-500" />
                    Inventory Groups
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    New Group
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateGroup} className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Group Name..."
                        className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-neutral-800 dark:border-neutral-700"
                        autoFocus
                    />
                    <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-2 text-gray-500 text-sm">Cancel</button>
                </form>
            )}

            <div className="flex gap-3 overflow-x-auto pb-2">
                {/* All Items / Default View Chip */}
                <button
                    onClick={() => onGroupSelect(null)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg whitespace-nowrap shadow-sm min-w-[80px] justify-center transition-colors ${activeGroupId === null ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                >
                    <span className="font-medium text-sm">All Items</span>
                </button>

                {Array.isArray(groups) && groups.map(group => (
                    <div
                        key={group.id}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg whitespace-nowrap shadow-sm min-w-[150px] justify-between transition-colors ${activeGroupId === group.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-neutral-900'}`}
                    >
                        <button
                            onClick={() => onGroupSelect(group.id)}
                            className="text-left flex-1 font-medium text-sm truncate max-w-[120px]"
                        >
                            {group.name}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setGroupToShare(group); }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full text-gray-500 hover:text-indigo-600 transition-colors"
                            title="Share Group"
                        >
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {groupToShare && (
                <ShareModal
                    group={groupToShare}
                    isOpen={!!groupToShare}
                    onClose={() => setGroupToShare(null)}
                />
            )}
        </div>
    );
}
