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
                            Image
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
                            {item.status === 'pending_price' ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                    <AlertCircle size={12} /> Pending
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                    <CheckCircle2 size={12} /> Done
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
        </div>
    );
}
