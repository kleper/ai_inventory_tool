"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import { MapPin, Phone, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, Edit2, Loader2, Image as ImageIcon, Download, Sparkles, Share2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { GalleryCarousel } from "@/components/ui/GalleryCarousel";
import { ItemPhotoUpdater } from "@/components/features/ItemPhotoUpdater";
import { ItemGalleryUploader } from "@/components/features/ItemGalleryUploader";
import { StaticMapThumbnail } from "@/components/ui/StaticMapThumbnail";
import { ShareItemModal } from "@/components/features/ShareItemModal";
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
import { formatPrice } from "@/lib/currency";
import { usePriceSearch } from "@/hooks/usePriceSearch";

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const itemId = parseInt(params.itemId as string);
    const { data: session } = useSession();
    const { searchPrice, isSearching } = usePriceSearch();

    // ... existing hooks
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
    const [isShareOpen, setIsShareOpen] = useState(false);
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
    const handlePriceSearch = async () => {
        if (!item) return;
        try {
            const updated = await searchPrice(item.id, item.group_id, group?.currency);
            // Update local state immediately
            if (updated) {
                setFormData(prev => ({ ...prev, price: updated.price ? updated.price.toString() : "" }));
                // Also update the 'item' view data if strictly bound, but SWR should handle it.
            }
        } catch (e) {
            // Error handled in hook
        }
    };

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

    const maxGalleryImages = 5;
    const rawGalleryImages = Array.isArray(item?.meta_data?.gallery_images) ? item.meta_data.gallery_images : [];
    const totalImageCount = (item.image_url ? 1 : 0) + rawGalleryImages.length;
    const displayGalleryImages = Array.from(new Set(
        [item.image_url, ...rawGalleryImages].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )).slice(0, maxGalleryImages);
    const remainingSlots = Math.max(0, maxGalleryImages - totalImageCount);

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
                        <div className="border border-black bg-white shadow-none">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-xs font-mono uppercase tracking-widest text-black">
                                        Gallery {totalImageCount}/{maxGalleryImages}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ItemGalleryUploader
                                        itemId={itemId}
                                        currentCount={totalImageCount}
                                        maxImages={maxGalleryImages}
                                        onUpdate={() => mutate()}
                                        canWrite={canWrite}
                                    />
                                    {remainingSlots > 0 && canWrite && (
                                        <span className="text-[10px] font-mono uppercase text-neutral-500">
                                            {remainingSlots} slots left
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="relative bg-neutral-50">
                                <GalleryCarousel
                                    mode="secure"
                                    items={displayGalleryImages}
                                    itemId={itemId}
                                    altBase={item.name}
                                >
                                    <ItemPhotoUpdater
                                        itemId={itemId}
                                        onUpdate={() => mutate()}
                                        canWrite={canWrite}
                                        buttonClassName="absolute bottom-4 right-4"
                                    />
                                </GalleryCarousel>
                            </div>
                        </div>
                    </div>

                    {/* Right: Details / Form */}
                    <div className="space-y-8">
                        {!isEditing && canWrite && (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button variant="outline" className="flex-1 w-full border-black hover:bg-black hover:text-white rounded-none uppercase font-bold tracking-wide" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                </Button>
                                <Button variant="outline" className="flex-1 w-full border-black hover:bg-black hover:text-white rounded-none uppercase font-bold tracking-wide" onClick={() => setIsShareOpen(true)}>
                                    <Share2 className="w-4 h-4 mr-2" /> Share Item
                                </Button>
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="outline" size="icon" className="flex-1 sm:flex-none border-black hover:bg-black hover:text-white rounded-none uppercase font-bold tracking-wide w-full sm:w-10 h-10 p-0" onClick={handleDownload}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Download Original</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button variant="destructive" className="flex-1 sm:flex-none px-6 rounded-none bg-white text-destructive border-destructive hover:bg-destructive hover:text-white uppercase font-bold tracking-wide w-full sm:w-auto" onClick={handleDelete}>
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
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
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="price" className="text-black uppercase tracking-wide font-bold">Price ({group?.currency || 'USD'})</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePriceSearch()}
                                                    disabled={isSearching}
                                                    className="h-6 text-[10px] uppercase rounded-none border-black hover:bg-black hover:text-white"
                                                >
                                                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                    {isSearching ? "Searching..." : "AI Search"}
                                                </Button>
                                            </div>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="rounded-none border-black focus-visible:ring-0"
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
                                                {formatPrice(item.price, group?.currency)}
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

                                    {/* Re-Analyze Button - Always visible if canWrite */}
                                    {canWrite && (
                                        <div className="border border-black p-4 bg-gray-50 flex flex-col gap-2 mt-8">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-black" />
                                                <h4 className="font-bold uppercase tracking-widest text-xs text-black">AI Analysis</h4>
                                            </div>
                                            <p className="text-xs text-neutral-600 mb-2">
                                                Run the AI analysis again to update description, tags, and category based on the image.
                                            </p>
                                            <Button
                                                onClick={async () => {
                                                    if (!confirm("This will overwrite the current description and category. Continue?")) return;
                                                    try {
                                                        toast.info("Starting analysis...");
                                                        const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}/analyze`, {
                                                            method: "POST",
                                                            headers: token ? { "Authorization": `Bearer ${token}` } : {}
                                                        });
                                                        if (!res.ok) throw new Error("Analysis failed to start");
                                                        toast.success("Analysis started in background. Page will update shortly.");
                                                        mutate(); // Re-fetch item to show "Analyzing" status
                                                    } catch (e) {
                                                        toast.error("Failed to start analysis");
                                                    }
                                                }}
                                                variant="outline"
                                                className="w-full border-black text-black hover:bg-black hover:text-white uppercase font-bold tracking-wide text-xs h-10"
                                            >
                                                <RotateCw className="w-3 h-3 mr-2" /> Re-analyze Image
                                            </Button>
                                        </div>
                                    )}

                                    {/* Specialized Blocks */}
                                    {item.meta_data && (
                                        <div className="space-y-6 mt-8">

                                            {/* Botanical Data */}
                                            {item.meta_data.scientific_name && (
                                                <div className="border border-black p-4 bg-green-50/50">
                                                    <div className="flex items-center gap-2 mb-3 border-b border-black/20 pb-2">
                                                        <Leaf className="w-4 h-4 text-green-700" />
                                                        <h4 className="font-bold uppercase tracking-widest text-xs text-green-800">Botanical Data</h4>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <p><span className="font-mono uppercase text-xs text-neutral-500">Scientific Name:</span> <span className="italic font-serif text-lg">{item.meta_data.scientific_name}</span></p>
                                                        {item.meta_data.common_name && <p><span className="font-mono uppercase text-xs text-neutral-500">Common Name:</span> <span className="font-bold">{item.meta_data.common_name}</span></p>}
                                                        {item.meta_data.properties && (
                                                            <div className="bg-white p-3 border border-black/10 mt-2">
                                                                <p className="font-mono text-xs text-neutral-500 uppercase mb-1">Properties</p>
                                                                <p className="text-neutral-700">{item.meta_data.properties}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Places / Contact Data */}
                                            {item.meta_data.phone && (
                                                <div className="border border-black p-4 bg-yellow-50/50">
                                                    <div className="flex items-center gap-2 mb-3 border-b border-black/20 pb-2">
                                                        <Phone className="w-4 h-4 text-yellow-700" />
                                                        <h4 className="font-bold uppercase tracking-widest text-xs text-yellow-800">Contact Info</h4>
                                                    </div>
                                                    {item.meta_data.business_category && (
                                                        <p className="mb-4 text-sm"><span className="font-mono uppercase text-xs text-neutral-500">Type:</span> <span className="font-bold">{item.meta_data.business_category}</span></p>
                                                    )}
                                                    <a href={`tel:${item.meta_data.phone}`} className="flex items-center justify-center gap-2 w-full bg-black text-white font-bold py-3 uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                                                        <Phone className="w-4 h-4" /> Call {item.meta_data.phone}
                                                    </a>
                                                </div>
                                            )}

                                            {/* Map Block */}
                                            {item.meta_data.coordinates && (
                                                <div className="border border-black p-4 bg-neutral-50">
                                                    <div className="flex items-center gap-2 mb-3 border-b border-black/20 pb-2">
                                                        <MapPin className="w-4 h-4 text-neutral-700" />
                                                        <h4 className="font-bold uppercase tracking-widest text-xs text-neutral-800">Location</h4>
                                                    </div>

                                                    {/* Static Map Thumbnail */}
                                                    <div className="mb-4 w-full h-40">
                                                        <StaticMapThumbnail
                                                            lat={item.meta_data.coordinates.lat}
                                                            lng={item.meta_data.coordinates.lng}
                                                            className="h-full"
                                                        />
                                                    </div>

                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${item.meta_data.coordinates.lat},${item.meta_data.coordinates.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full border border-black text-black font-bold py-3 uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                                    >
                                                        <MapPin className="w-4 h-4" /> View on Google Maps
                                                    </a>
                                                    <p className="text-[10px] font-mono text-center mt-2 text-neutral-500">
                                                        {Number(item.meta_data.coordinates.lat).toFixed(6)}, {Number(item.meta_data.coordinates.lng).toFixed(6)}
                                                    </p>
                                                </div>
                                            )}

                                        </div>
                                    )}
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
                <ShareItemModal
                    open={isShareOpen}
                    onOpenChange={setIsShareOpen}
                    item={item}
                    onUpdate={mutate}
                />
            </div>
        </div>
    );
}
