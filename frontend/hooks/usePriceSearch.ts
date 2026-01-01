import { useSWRConfig } from "swr";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";

// Rewriting to a custom hook that returns the mutation trigger
import { useSession } from "next-auth/react";
import { useState } from "react";

export function usePriceSearch() {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const { mutate } = useSWRConfig();
    const [isSearching, setIsSearching] = useState(false);

    const searchPrice = async (itemId: number, folderId?: number, folderCurrency: string = "USD") => {
        setIsSearching(true);
        const toastId = toast.loading("Searching price with AI...");

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}/price-search`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to search price");
            }

            const updatedItem = await res.json();

            // 1. Invalidate Item Detail
            // SWR Key might be: `${API_BASE_URL}/api/v1/inventory/items/${itemId}`
            await mutate(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, updatedItem, false);

            // 2. Invalidate Folder List (Grid)
            // Key: `${API_BASE_URL}/api/v1/inventory/groups/${folderId}/items` OR similar.
            // I need to be careful with SWR keys. They are usually URLs.
            // Let's just mutate the likely keys.
            if (folderId) {
                await mutate((key) => typeof key === 'string' && key.includes(`/groups/${folderId}/items`));
                await mutate((key) => typeof key === 'string' && key.includes(`/groups/${folderId}`)); // Folder details/stats
            }

            toast.dismiss(toastId);
            toast.success(`PRICE UPDATED: ${formatPrice(updatedItem.price, folderCurrency)}`, { // Brutalist Styled Toast handled by Sonner theme
                style: {
                    background: "black",
                    color: "white",
                    border: "1px solid white",
                    borderRadius: "0px"
                }
            });

            return updatedItem;

        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.message);
            throw error;
        } finally {
            setIsSearching(false);
        }
    };

    return { searchPrice, isSearching };
}
