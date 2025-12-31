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
import { ArrowLeft, Save, Trash2, Edit2, Loader2, Image as ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecureImage } from "@/components/ui/SecureImage";
import { ItemPhotoUpdater } from "@/components/features/ItemPhotoUpdater";
import { downloadSecureFile } from "@/lib/download";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
        quantity: "",
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
                quantity: item.quantity?.toString() || "1",
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
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "PUT",
                headers,
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
            const headers: HeadersInit = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "DELETE",
                headers
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Item deleted");
            router.back();
        } catch (err) {
            toast.error("Delete failed");
        }
    };
    const handleDownload = async () => {
        try {
            if (!token || !item?.image_url) return;
            // Provide a nice filename
            const filename = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            const downloadUrl = `${API_BASE_URL}/api/v1/inventory/items/${itemId}/download`;
            // Actually the endpoint is media, let's fix that in next step if logic was wrong, 
            // but previously defined in media.py as /api/v1/media/items/{id}/download
            // The plan said /api/v1/media...
            await downloadSecureFile(`${API_BASE_URL}/api/v1/media/items/${itemId}/download`, filename, token);
            toast.success("Download started");
        } catch (err) {
            toast.error("Download failed");
        }
    };

    // ...

    // ...

    // Loading / Error States
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white text-black">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-black" />
                    <p className="font-mono uppercase tracking-widest text-black animate-pulse">Loading Item...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="flex h-screen items-center justify-center bg-white text-black">
                <div className="border border-destructive p-8 shadow-none text-center max-w-md">
                    <h2 className="text-xl font-bold uppercase mb-4 text-destructive">Item Not Found</h2>
                    <p className="mb-6 font-mono text-sm">The item you are looking for does not exist or you do not have permission to view it.</p>
                    <Button onClick={() => router.back()} variant="outline" className="w-full border-black text-black hover:bg-black hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black p-6 md:p-12 font-sans">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-black">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="h-12 w-12 p-0 border-black hover:bg-black hover:text-white rounded-none">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-medium uppercase tracking-tight text-black leading-none">
                                {isEditing ? "Edit Item" : item.name}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-widest border border-black">
                                    {item.category || "Uncategorized"}
                                </span>
                                <span className="text-neutral-500 text-xs uppercase tracking-wide font-mono">
                                    ID: {item.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {!canWrite && (
                            <div className="border border-neutral-300 text-neutral-500 text-xs font-bold px-4 py-2 uppercase tracking-widest flex items-center gap-2">
                                Read-only
                            </div>
                        )}
                        {item.status !== 'completed' && !isEditing && (
                            <div className="bg-neutral-100 text-black border border-black text-xs font-bold px-4 py-2 uppercase tracking-widest flex items-center gap-2">
                                Needs Review
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left: Image */}
                    <div className="space-y-6">
                        <div className="aspect-square bg-neutral-50 rounded-none border border-black relative group shadow-none overflow-hidden">
                            <SecureImage
                                itemId={parseInt(itemId as string)} // Ensure ID is number
                                fallbackSrc={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                key={item.image_url} // Force remount on image update
                                variant="thumbnail"
                            />
                            <div className="absolute inset-0 border border-transparent group-hover:border-black/20 transition-colors pointer-events-none z-10" />
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
                                <Button variant="outline" className="flex-1 border-black hover:bg-black hover:text-white rounded-none uppercase font-bold tracking-wide" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                </Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="border-black hover:bg-black hover:text-white rounded-none uppercase font-bold tracking-wide w-10 h-10 p-0" onClick={handleDownload}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Download Original</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Button variant="destructive" className="px-6 rounded-none bg-white text-destructive border-destructive hover:bg-destructive hover:text-white uppercase font-bold tracking-wide" onClick={handleDelete}>
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>
                        )}

                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="space-y-6 bg-white p-6 border border-black shadow-none">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-black uppercase tracking-wide font-bold">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="bg-white text-black border-black h-10"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="category" className="text-black uppercase tracking-wide font-bold">Category</Label>
                                            <Input
                                                id="category"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="bg-white text-black border-black h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="price" className="text-black uppercase tracking-wide font-bold">Price ($)</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="bg-white text-black border-black h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="quantity" className="text-black uppercase tracking-wide font-bold">Quantity</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                className="bg-white text-black border-black h-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-black uppercase tracking-wide font-bold">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={6}
                                            className="bg-white text-black border-black rounded-none focus:ring-0 focus:border-black resize-none font-sans"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-dashed border-neutral-300 justify-end">
                                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-black hover:bg-neutral-100 uppercase tracking-wide font-medium">Cancel</Button>
                                    <Button type="submit" className="gap-2 bg-black text-white font-bold border border-black hover:bg-neutral-800 uppercase tracking-wide rounded-none">
                                        <Save className="w-4 h-4" /> Save Changes
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-8">
                                <div className="bg-white border border-black p-6 shadow-none">
                                    <div className="grid grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <span className="text-neutral-500 text-xs uppercase tracking-widest block mb-2">Price Estimate</span>
                                            <span className="text-4xl font-black text-black block">
                                                {item.price ? `$${parseFloat(item.price.toString()).toFixed(2)}` : "--"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 text-xs uppercase tracking-widest block mb-2">Quantity</span>
                                            <span className="text-4xl font-black text-black block">
                                                {item.quantity || 1}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="prose prose-neutral max-w-none">
                                        <h3 className="text-black font-bold uppercase tracking-wide border-b border-neutral-200 pb-2 mb-4">Description</h3>
                                        <p className="text-neutral-700 leading-relaxed font-sans">
                                            {item.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-black flex justify-between items-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
                                    <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                                    <span className={`px-2 py-1 border ${item.status === 'completed' ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200'}`}>
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
