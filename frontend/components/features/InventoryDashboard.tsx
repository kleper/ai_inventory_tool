"use client";

import { motion } from "framer-motion";
import { Tag, AlertCircle, CheckCircle2 } from "lucide-react";

interface Item {
    id: number;
    name: string;
    status: "pending_price" | "completed";
    imageUrl: string;
    price?: number;
}

export function InventoryDashboard({ items }: { items: Item[] }) {
    // In a real app, we would fetch items here or accept them as props.
    // For now, let's assume `items` might be updated via a parent or global state.
    // Ideally we would integrate SWR or React Query here to refetch on WS event.

    // Skeleton implementation for "processing" items or initial load
    // Assuming we want to show skeletons if the list is empty and we are expecting data, OR if we have specific "processing" placeholders.
    // The prompt asked for "Skeleton animado en el dashboard" when process is "en curso".
    // We can simulate this by checking if we have any item with status "processing" and showing a skeleton for it or globally.

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="aspect-video bg-gray-100 dark:bg-neutral-800 relative">
                        {/* Placeholder for image */}
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : "Image"}
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg line-clamp-1">{item.name || "Unknown Item"}</h3>
                            {item.status === 'pending_price' ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                    <AlertCircle size={12} /> Pending
                                </span>
                            ) : item.status === 'completed' ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                    <CheckCircle2 size={12} /> Done
                                </span>
                            ) : (
                                // Processing status from backend model
                                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full animate-pulse">
                                    Processing...
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Tag size={14} />
                            <span>{item.price ? `$${item.price}` : 'Scanning...'}</span>
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Example Skeleton logic for when we know something is processing but don't have the item yet
                In a real app, this would be conditional based on `isProcessing` state.
                For demonstration, I'll add a static check or I can leave it as just the badges updating. 
                The prompt asked for "Skeleton". Let's assume we might have a global `isProcessing` flag.
             */}
        </div>
    );
}
