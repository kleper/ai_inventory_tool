"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import { Link } from "lucide-react"; // Wait, Link is next/link, Icon is Link
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, Edit2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecureImage } from "@/components/ui/SecureImage";
import { ItemPhotoUpdater } from "@/components/features/ItemPhotoUpdater";
// import  from "@/components/ui/alert"; // Removed unused Alert import

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";
// fetcher removed

export default function ItemDetailPage() {
    const params = useParams();
    const itemId = params.itemId as string;
    const router = useRouter();
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;

    const { data: item, error, isLoading, mutate } = useSWR(
        (itemId && token) ? `${API_BASE_URL}/api/v1/inventory/items/${itemId}` : null,
        fetcher
    );

    // Fetch Group Permission if item exists and has group_id
    const { data: group } = useSWR(
        (item?.group_id && token) ? `${API_BASE_URL}/api/v1/groups/${item.group_id}` : null,
        fetcher
    );

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        description: "",
        status: ""
    });

    // Permission Logic
    // If no group_id, I assume I own it (personal item). 
    // Wait, backend protects personal items too (user_id check).
    // If I see it, I have read access.
    // If personal item: I am owner (unless shared? personal items aren't shared unless in group).
    // So if !group_id => I am owner.
    // If group_id => Check group role.

    const canWrite = !item?.group_id || (group?.my_role === "OWNER" || group?.my_role === "EDITOR");

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || "",
                category: item.category || "",
                price: item.price?.toString() || "",
                description: item.description || "",
                status: item.status
            });
            // Auto-edit if pending/review AND I have write access
            if (canWrite && (item.status === 'pending_price' || item.status === 'needs_review')) {
                setIsEditing(true);
            }
        }
    }, [item, canWrite]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error("Failed to update");
            toast.success("Item updated");
            setIsEditing(false);
            mutate();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Item deleted");
            router.back();
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    // ...

    // Loading / Error States
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-mono uppercase tracking-widest animate-pulse">Loading Item...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="border-[3px] border-destructive p-8 shadow-brutal text-center max-w-md">
                    <h2 className="text-xl font-black uppercase mb-4 text-destructive">Item Not Found</h2>
                    <p className="mb-6 font-mono text-sm">The item you are looking for does not exist or you do not have permission to view it.</p>
                    <Button onClick={() => router.back()} variant="outline" className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-mono">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b-[3px] border-white">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="h-12 w-12 p-0 border-white hover:bg-white hover:text-black">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">
                                {isEditing ? "Edit Item" : item.name}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-primary text-black text-xs font-bold px-2 py-1 uppercase tracking-widest border border-primary">
                                    {item.category || "Uncategorized"}
                                </span>
                                <span className="text-neutral-400 text-xs uppercase tracking-wide">
                                    ID: {item.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {!canWrite && (
                            <div className="border border-white text-white text-xs font-bold px-4 py-2 uppercase tracking-widest flex items-center gap-2">
                                Read-only
                            </div>
                        )}
                        {item.status !== 'completed' && !isEditing && (
                            <div className="bg-yellow-100 text-black border border-yellow-400 text-xs font-bold px-4 py-2 uppercase tracking-widest flex items-center gap-2">
                                Needs Review
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left: Image */}
                    <div className="space-y-6">
                        <div className="aspect-square bg-neutral-900 rounded-none border-[3px] border-white relative group shadow-brutal overflow-hidden">
                            <SecureImage
                                itemId={parseInt(itemId as string)} // Ensure ID is number
                                fallbackSrc={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                key={item.image_url} // Force remount on image update
                            />
                            <div className="absolute inset-0 border-[3px] border-transparent group-hover:border-primary transition-colors pointer-events-none z-10" />
                            <ItemPhotoUpdater
                                itemId={parseInt(itemId as string)}
                                onUpdate={() => mutate()}
                                canWrite={canWrite}
                            />
                        </div>
                    </div>

                    {/* Right: Details / Form */}
                    <div className="space-y-8">
                        {!isEditing && canWrite && (
                            <div className="flex gap-4">
                                <Button variant="outline" className="flex-1 border-white hover:bg-white hover:text-black" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                </Button>
                                <Button variant="destructive" className="px-6 border-white" onClick={handleDelete}>
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>
                        )}

                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="space-y-6 bg-neutral-900/50 p-6 border-[3px] border-white shadow-brutal">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-white">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="bg-black text-white border-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="category" className="text-white">Category</Label>
                                            <Input
                                                id="category"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="bg-black text-white border-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="price" className="text-white">Price ($)</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="bg-black text-white border-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-white">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={6}
                                            className="bg-black text-white border-white rounded-none focus:ring-0 focus:border-primary resize-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-dashed border-neutral-700 justify-end">
                                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-white hover:bg-white hover:text-black">Cancel</Button>
                                    <Button type="submit" className="gap-2 bg-primary text-black font-black border-white hover:bg-yellow-400">
                                        <Save className="w-4 h-4" /> Save Changes
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-8">
                                <div className="bg-black border-[3px] border-white p-6 shadow-brutal">
                                    <div className="grid grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <span className="text-neutral-400 text-xs uppercase tracking-widest block mb-2">Price Estimate</span>
                                            <span className="text-4xl font-black text-primary block">
                                                {item.price ? `$${parseFloat(item.price.toString()).toFixed(2)}` : "--"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-neutral-400 text-xs uppercase tracking-widest block mb-2">Quantity</span>
                                            <span className="text-4xl font-black text-white block">
                                                {item.quantity || 1}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="prose prose-invert max-w-none">
                                        <h3 className="text-white font-bold uppercase tracking-wide border-b border-neutral-800 pb-2 mb-4">Description</h3>
                                        <p className="text-neutral-300 leading-relaxed">
                                            {item.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t-[3px] border-white flex justify-between items-center text-xs font-mono text-neutral-400 uppercase tracking-widest">
                                    <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                                    <span className={`px-2 py-1 ${item.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                                        Status: {item.status}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
