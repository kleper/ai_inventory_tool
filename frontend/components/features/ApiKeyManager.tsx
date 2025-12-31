"use client";

import { useState } from "react";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Trash2, Copy, Check } from "lucide-react";
import { useSession } from "next-auth/react";

interface ApiKey {
    id: number;
    prefix: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
}

export function ApiKeyManager() {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const fetcher = useAuthFetcher();
    const { data: keys, mutate, isLoading } = useSWR<ApiKey[]>(
        token ? `${API_BASE_URL}/api/v1/api-keys` : null,
        fetcher
    );

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/api-keys`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ label: newLabel })
            });

            if (!res.ok) throw new Error("Failed to create key");

            const data = await res.json();
            setGeneratedKey(data.secret_key); // Show the secret key!
            mutate(); // Refresh list
            toast.success("API Key generated");
        } catch (error) {
            toast.error("Failed to create API Key");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseCreate = () => {
        // If key was generated, resetting it now means it's lost forever from UIView.
        setGeneratedKey(null);
        setNewLabel("");
        setIsCreateOpen(false);
        setCopied(false);
    };

    const handleCopy = () => {
        if (generatedKey) {
            navigator.clipboard.writeText(generatedKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Copied to clipboard");
        }
    };

    const handleRevoke = async (id: number) => {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/api-keys/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Key revoked");
            mutate();
        } catch (e) {
            toast.error("Error revoking key");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black pb-4">
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">API Keys</h2>
                    <p className="font-mono text-sm text-neutral-600">Manage programmatic access to your inventory.</p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-black text-white hover:bg-neutral-800 rounded-none uppercase tracking-wider font-bold"
                >
                    Generate New API Key
                </Button>
            </div>

            <div className="border border-black bg-white">
                <table className="w-full text-left text-sm font-mono border-collapse">
                    <thead className="bg-neutral-100 border-b border-black text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-3 border-r border-black">Label</th>
                            <th className="p-3 border-r border-black">Prefix</th>
                            <th className="p-3 border-r border-black">Created</th>
                            <th className="p-3 border-r border-black">Last Used</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {isLoading && (
                            <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                        )}
                        {!isLoading && keys?.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No API Keys found.</td></tr>
                        )}
                        {keys?.map((key) => (
                            <tr key={key.id} className="hover:bg-neutral-50">
                                <td className="p-3 border-r border-black font-bold">{key.label}</td>
                                <td className="p-3 border-r border-black">{key.prefix}...</td>
                                <td className="p-3 border-r border-black">{new Date(key.created_at).toLocaleDateString()}</td>
                                <td className="p-3 border-r border-black">
                                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "-"}
                                </td>
                                <td className="p-3">
                                    <button
                                        onClick={() => handleRevoke(key.id)}
                                        className="text-red-600 hover:bg-red-50 px-2 py-1 border border-red-600 uppercase text-xs font-bold"
                                    >
                                        Revoke
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CREATE DIALOG */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
                <DialogContent className="border-black rounded-none sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-bold tracking-wider">
                            {generatedKey ? "API Key Generated" : "Create New API Key"}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            {generatedKey
                                ? "Copy this key now. You won't be able to see it again!"
                                : "Enter a label to identify this key (e.g. 'Zapier Integration')."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {generatedKey ? (
                        <div className="space-y-4 pt-4">
                            <div className="relative">
                                <div className="w-full bg-neutral-100 border border-black p-4 font-mono text-sm break-all pr-10">
                                    {generatedKey}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 p-2 hover:bg-neutral-200"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                                <p className="text-yellow-800 text-xs font-mono uppercase font-bold">
                                    Warning: This key will be hidden forever once you close this modal.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="label" className="uppercase font-mono text-xs">Key Label</Label>
                                <Input
                                    id="label"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="MY APP"
                                    required
                                    className="rounded-none border-black focus-visible:ring-0 focus-visible:border-black"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-black text-white rounded-none uppercase tracking-widest hover:bg-neutral-800"
                            >
                                {isCreating ? "Generating..." : "Create Secret Key"}
                            </Button>
                        </form>
                    )}

                    <DialogFooter>
                        {generatedKey && (
                            <Button onClick={handleCloseCreate} className="w-full bg-black text-white rounded-none uppercase">
                                I have copied the key
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
