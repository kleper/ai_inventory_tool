"use client";

import useSWR from "swr";
import { InventoryCard, InventoryCardSkeleton } from "./InventoryCard";
import { useNotifications } from "@/hooks/useNotifications";
import { AlertCircle } from "lucide-react";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function InventoryDashboard() {
    // 1. WebSocket & Notification Hook
    useNotifications();

    // 2. Data Fetching with SWR
    // Uses the new GET endpoint. 
    // Note: Protocol needs to be absolute or proxy configured. Since we are in client component, relative path works if Next rewrites to backend.
    // If not, we might need full URL. Assuming local dev proxy or docker setup, relative should work if next.config.ts rewrites are set (not checked yet).
    // For now, let's try direct call or use full URL hook from Layout context if we had one.
    // Sticking to relative path `/api/v1/inventory/items` assuming we might need to config proxy later.
    // Wait, earlier I assumed direct backend calls on 8000. Client side fetch to localhost:8000 won't work in Docker internal network unless port mapped.
    // Assuming port 8000 is exposed to host.
    const { data: items, error, isLoading } = useSWR(
        "http://localhost:8000/api/v1/inventory/items",
        fetcher
    );

    if (error) return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
            <AlertCircle className="mx-auto w-8 h-8 mb-2" />
            <p>Failed to load inventory.</p>
        </div>
    );

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <InventoryCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400">
                <p>No items found. Start by scanning an object!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item: any) => (
                <InventoryCard key={item.id} item={item} />
            ))}
        </div>
    );
}
