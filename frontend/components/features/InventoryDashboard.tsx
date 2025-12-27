"use client";

import useSWR from "swr";
import { InventoryCard, InventoryCardSkeleton } from "./InventoryCard";
import { useNotifications } from "@/hooks/useNotifications";
import { AlertCircle } from "lucide-react";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";

// Default fetcher removed, using hook instead

import { CameraCapture } from "./CameraCapture";
import { InvoiceUpload } from "./InvoiceUpload";
import { ReconciliationModal } from "./ReconciliationModal";
import { API_BASE_URL } from "@/lib/config";
import { useState } from "react";
import { GroupManager } from "./GroupManager";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// ... imports

export function InventoryDashboard() {
    // 1. WebSocket & Notification Hook
    useNotifications();

    // Group Selection State
    const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 2. Data Fetching with SWR
    const fetcher = useAuthFetcher();

    const url = activeGroupId
        ? `${API_BASE_URL}/api/v1/inventory/items?group_id=${activeGroupId}`
        : `${API_BASE_URL}/api/v1/inventory/items`;

    // Use mutate to refresh after upload
    const { data: items, error, isLoading, mutate } = useSWR(url, fetcher);

    const handleCapture = async (imageSrc: string) => {
        setIsProcessing(true);
        try {
            // Convert base64 to blob
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("file", file);
            if (activeGroupId) formData.append("group_id", activeGroupId.toString());

            // Note: backend expects query param for optional int usually, but let's try query param for safety
            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/process-object?group_id=${activeGroupId || ''}`, {
                method: "POST",
                body: formData
            });

            if (!apiRes.ok) throw new Error("Processing failed");

            toast.success("Item processed!");
            mutate(); // Refresh list
        } catch (err) {
            toast.error("Error processing specific object");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInvoiceUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/match-invoice?user_id=1&group_id=${activeGroupId || ''}`, {
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

    if (error) return (
        // ... (Error UI)
        <div className="space-y-6">
            <GroupManager activeGroupId={activeGroupId} onGroupSelect={setActiveGroupId} />
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="mx-auto w-8 h-8 mb-2" />
                <p>Failed to load inventory.</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <GroupManager activeGroupId={activeGroupId} onGroupSelect={setActiveGroupId} />

            {/* Input Section */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border shadow-sm">
                    <h4 className="font-semibold mb-3">Add Item (Camera)</h4>
                    <CameraCapture onCapture={handleCapture} />
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border shadow-sm">
                    <h4 className="font-semibold mb-3">Upload Invoice</h4>
                    <InvoiceUpload onFileSelect={handleInvoiceUpload} />
                </div>
            </div>

            {isProcessing && <div className="text-center py-2 text-indigo-600 flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> AI Processing...</div>}

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <InventoryCardSkeleton key={i} />
                    ))}
                </div>
            ) : (!items || items.length === 0) ? (
                <div className="text-center py-20 text-gray-400">
                    <p>No items found in this group.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map((item: any) => (
                        <InventoryCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
