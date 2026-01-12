"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Copy, Trash2, Globe, Share2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useSession } from "next-auth/react";

interface ShareItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: any;
    onUpdate: () => void;
}

export function ShareItemModal({ open, onOpenChange, item, onUpdate }: ShareItemModalProps) {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const [loading, setLoading] = useState(false);

    const isShared = item?.is_public && item?.public_token;
    const shareUrl = isShared ? `${window.location.origin}/share/${item.public_token}` : "";

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${item.id}/share`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to generate link");
            toast.success("Public link generated!");
            onUpdate();
        } catch (err) {
            toast.error("Error generating link");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${item.id}/share`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to revoke link");
            toast.success("Link revoked. Needs a new token to share again.");
            onUpdate();
        } catch (err) {
            toast.error("Error revoking link");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader>
                    <DialogTitle className="uppercase font-bold tracking-tight text-xl flex items-center gap-2">
                        <Share2 className="w-5 h-5" /> Share Item
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs text-neutral-500 uppercase">
                        Create a public link for anyone to view this item.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {!isShared ? (
                        <div className="flex flex-col gap-4">
                            <div className="bg-neutral-50 p-4 border border-black border-dashed text-center">
                                <Globe className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                                <p className="text-sm text-neutral-600 mb-4">
                                    Item is currently private. Generate a link to share via WhatsApp, Twitter, etc.
                                </p>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="w-full bg-black text-white hover:bg-neutral-800 rounded-none h-12 text-sm font-bold tracking-wider uppercase border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-none transition-all"
                                >
                                    {loading ? "Generating..." : "Generate Public Link"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider">Public Link</label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={shareUrl}
                                        className="font-mono text-xs bg-neutral-50 border-black rounded-none h-10"
                                    />
                                    <Button
                                        onClick={copyToClipboard}
                                        className="shrink-0 bg-black text-white rounded-none border border-black active:translate-y-[1px]"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-600 p-3 flex items-start gap-3">
                                <Globe className="w-4 h-4 text-green-700 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-green-800 uppercase">Currently Public</p>
                                    <p className="text-[10px] text-green-700 font-mono">
                                        Anyone with this link can view this item card.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleRevoke}
                                    disabled={loading}
                                    className="w-full border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-none h-10 text-xs font-bold uppercase"
                                >
                                    {loading ? "Revoking..." : "Revoke / Delete Link"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
