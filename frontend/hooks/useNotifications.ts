"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useWebSocket } from "@/components/providers/WebSocketProvider";

// Hook to handle global notifications and data revalidation
export function useNotifications() {
    const { lastMessage } = useWebSocket();
    const { mutate } = useSWRConfig();
    const [latestNotification, setLatestNotification] = useState<any>(null);

    useEffect(() => {
        if (!lastMessage) return;

        // Handle INVOICE_PROCESSED message
        if (lastMessage.type === "INVOICE_PROCESSED") {
            const { status, matches_found } = lastMessage;

            if (status === "success") {
                toast.success(`Invoice processed! Found ${matches_found} matches.`);

                // Revalidate items data to show new prices or statuses
                mutate("/api/v1/inventory/items");
                // Also revalidate invoices list if we had one
                // mutate("/api/v1/inventory/invoices"); 
            } else if (status === "failed") {
                toast.error("Invoice processing failed.");
            }

            setLatestNotification(lastMessage);
        }

        // Handle other message types...

    }, [lastMessage, mutate]);

    return { latestNotification };
}
