"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { InventoryCard, InventoryCardSkeleton } from "@/components/features/InventoryCard";
import { CameraCapture } from "@/components/features/CameraCapture";
import { API_BASE_URL } from "@/lib/config";
import { InvoiceUpload } from "@/components/features/InvoiceUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, ArrowLeft, Camera, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FolderDetailPage() {
    const params = useParams();
    const groupId = params.groupId as string;
    useNotifications(); // Ensure WS is connected

    // Fetch Group Details for Header
    // TODO: Ideally we should have a single endpoint for group details, but we can reuse the list for now or assume name is static if not fetched yet?
    // Let's assume we need a name. For now, we'll fetch items and generic info.

    // Fetch Items
    const { data: items, error, isLoading, mutate } = useSWR(
        groupId ? `${API_BASE_URL}/api/v1/inventory/items?group_id=${groupId}` : null,
        fetcher
    );

    // Fetch Group Info (Optional: Create dedicated endpoint provided or filter from list if cached?)
    // Basic implementation: Just show ID or fetch list to find name. Better UX: Group Detail Endpoint.
    // For now, let's keep it simple.

    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleCapture = async (imageSrc: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("group_id", groupId);

            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/process-object?group_id=${groupId}`, {
                method: "POST",
                body: formData
            });

            if (!apiRes.ok) throw new Error("Processing failed");

            toast.success("Item processed!");
            mutate();
        } catch (err) {
            toast.error("Error processing object");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInvoiceUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            // TODO: User ID should be dynamic from session context? Yes, typically backend infers from token or we pass it?
            // The existing API example used user_id=1 query param. Let's fix that later or keep reusing for now.
            // Ideally backend gets user from JWT.
            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/match-invoice?user_id=1&group_id=${groupId}`, {
                method: "POST",
                body: formData
            });

            if (!apiRes.ok) throw new Error("Upload failed");

            toast.success("Invoice uploaded for processing");
        } catch (err) {
            toast.error("Error uploading invoice");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredItems = items?.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white dark:bg-black border-b border-border/40 p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Breadcrumbs / Back */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/inventory" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> My Inventories
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-foreground">Folder #{groupId}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold tracking-tight">Folder Items</h1>

                        <div className="flex items-center gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm">
                                        <Camera className="w-4 h-4" /> Scan Item
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <CameraCapture onCapture={handleCapture} />
                                </DialogContent>
                            </Dialog>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2 border-border/60">
                                        <Upload className="w-4 h-4" /> Upload Invoice
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <InvoiceUpload onFileSelect={handleInvoiceUpload} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 pt-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                className="pl-9 bg-gray-50 dark:bg-neutral-900 border-border/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                            <SlidersHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-black">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <InventoryCardSkeleton key={i} />)}
                        </div>
                    ) : (!filteredItems || filteredItems.length === 0) ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">No items found in this folder.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredItems.map((item: any) => (
                                <InventoryCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
