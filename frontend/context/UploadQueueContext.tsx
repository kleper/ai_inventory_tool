"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";

// Types
export type QueueItemStatus = 'PENDING' | 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export interface QueueItem {
    tempId: string;
    file: Blob;
    groupId: string;
    status: QueueItemStatus;
    thumbnailUrl: string;
    progress: number;
    error?: string;
    latitude?: number;
    longitude?: number;
}

interface UploadQueueContextType {
    queue: QueueItem[];
    addToQueue: (file: Blob, groupId: string, lat?: number, lng?: number) => void;
    retryItem: (tempId: string) => void;
    removeItem: (tempId: string) => void;
    isProcessing: boolean;
}

const UploadQueueContext = createContext<UploadQueueContextType | undefined>(undefined);

export const UploadQueueProvider = ({ children }: { children: ReactNode }) => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;

    // Add Item to Queue
    const addToQueue = useCallback((file: Blob, groupId: string, lat?: number, lng?: number) => {
        const tempId = uuidv4();
        const thumbnailUrl = URL.createObjectURL(file);

        const newItem: QueueItem = {
            tempId,
            file,
            groupId,
            status: 'PENDING',
            progress: 0,
            thumbnailUrl,
            latitude: lat,
            longitude: lng
        };

        setQueue(prev => [...prev, newItem]);
        toast.success("Photo added to processing queue");
    }, []);

    // Retry functionality
    const retryItem = useCallback((tempId: string) => {
        setQueue(prev => prev.map(item =>
            item.tempId === tempId ? { ...item, status: 'PENDING', error: undefined, progress: 0 } : item
        ));
    }, []);

    // Remove item
    const removeItem = useCallback((tempId: string) => {
        setQueue(prev => prev.filter(item => item.tempId !== tempId));
    }, []);

    // WORKER: Process Queue
    useEffect(() => {
        const processQueue = async () => {
            // Find first PENDING item
            const pendingItem = queue.find(item => item.status === 'PENDING');
            if (!pendingItem) return;

            // Mark as UPLOADING
            setQueue(prev => prev.map(i => i.tempId === pendingItem.tempId ? { ...i, status: 'UPLOADING', progress: 10 } : i));

            try {
                // Prepare Payload
                const formData = new FormData();
                formData.append("file", pendingItem.file as File); // Casting Blob to File if needed, or ensuring Blob is accepted
                formData.append("group_id", pendingItem.groupId);

                if (pendingItem.latitude) formData.append("latitude", pendingItem.latitude.toString());
                if (pendingItem.longitude) formData.append("longitude", pendingItem.longitude.toString());

                console.log(`Queue Worker: Processing ${pendingItem.tempId}`);

                // Simulate Upload Progress? Or just jump to Analyzing
                setQueue(prev => prev.map(i => i.tempId === pendingItem.tempId ? { ...i, status: 'ANALYZING', progress: 50 } : i));

                const headers: HeadersInit = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/api/v1/inventory/process-object?group_id=${pendingItem.groupId}`, {
                    method: "POST",
                    headers,
                    body: formData
                });

                if (!res.ok) {
                    throw new Error("API processing failed");
                }

                // Success
                console.log(`Queue Worker: Success ${pendingItem.tempId}`);
                setQueue(prev => prev.map(i => i.tempId === pendingItem.tempId ? { ...i, status: 'COMPLETED', progress: 100 } : i));

                // Remove from queue after short delay to show completion? or immediately?
                // Request says: "When COMPLETED, disappears from list and appears in main list (invalidation)"
                // We should trigger a global revalidation event if possible or let the user SWR revalidate.
                // For now, we remove it from the visible queue after 2 seconds so user sees "Success"
                setTimeout(() => {
                    removeItem(pendingItem.tempId);
                    // Trigger global SWR mutate? We might need to expose a callback or use global mutate
                    // For now, relies on SWR caching handling it next time or interval.
                    // Better: The Page component can subscribe to queue changes or we assume user refreshes/navigation handles it.
                    // Ideally we should mutate SWR key here but we don't have easy access to SWR outside hook context easily without importing matchers.

                    // HACK: Dispatch a custom event for SWR updates
                    window.dispatchEvent(new Event('inventory-updated'));

                }, 2000);

            } catch (error: any) {
                console.error(`Queue Worker Error [${pendingItem.tempId}]:`, error);
                setQueue(prev => prev.map(i => i.tempId === pendingItem.tempId ? { ...i, status: 'ERROR', error: error.message || "Unknown Error" } : i));
            }
        };

        // If there is a PENDING item and NO item is currently UPLOADING or ANALYZING (Sequential)
        const isBusy = queue.some(item => item.status === 'UPLOADING' || item.status === 'ANALYZING');
        if (!isBusy) {
            processQueue();
        }

    }, [queue, token, removeItem]);


    return (
        <UploadQueueContext.Provider value={{ queue, addToQueue, retryItem, removeItem, isProcessing: queue.length > 0 }}>
            {children}
        </UploadQueueContext.Provider>
    );
};

export const useUploadQueue = () => {
    const context = useContext(UploadQueueContext);
    if (!context) throw new Error("useUploadQueue must be used within UploadQueueProvider");
    return context;
};
