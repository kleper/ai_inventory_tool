"use client";

import { AlertCircle, CheckCircle2, Clock, Tag } from "lucide-react";
import { motion } from "framer-motion";

interface Item {
    id: number;
    name: string;
    description?: string;
    category?: string;
    status: string; // pending_price, completed, processing
    imageUrl?: string;
    price?: number;
}

export function InventoryCard({ item }: { item: Item }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
        >
            {/* Image Area - Aspect Square */}
            <div className="aspect-square bg-gray-100 dark:bg-neutral-800 relative overflow-hidden">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <span className="text-4xl opacity-20">📦</span>
                    </div>
                )}

                {/* Status Badge Overlay */}
                <div className="absolute top-2 right-2">
                    {item.status === 'pending_price' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full shadow-sm">
                            <Clock className="w-3 h-3" /> Pending
                        </span>
                    ) : item.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                    ) : item.status === 'needs_review' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full shadow-sm">
                            <AlertCircle className="w-3 h-3" /> Review
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full shadow-sm animate-pulse">
                            Processing
                        </span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4 space-y-2">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
                        {item.category || "Uncategorized"}
                    </p>
                    <h3 className="font-semibold text-base leading-tight line-clamp-2 min-h-[2.5rem]">
                        {item.name || "Unknown Item"}
                    </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-neutral-800">
                    {item.price ? (
                        <div className="flex items-center text-green-600 font-bold dark:text-green-400">
                            <span className="text-lg">${item.price.toFixed(2)}</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-gray-400 text-sm italic">
                            <span>--.--</span>
                        </div>
                    )}
                    {/* Action/Edit button placeholder */}
                </div>
            </div>
        </motion.div>
    );
}

// Skeleton Component
export function InventoryCardSkeleton() {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="aspect-square bg-gray-100 dark:bg-neutral-800 animate-pulse" />
            <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded w-1/3 animate-pulse" />
                <div className="h-5 bg-gray-100 dark:bg-neutral-800 rounded w-3/4 animate-pulse" />
                <div className="pt-2 border-t border-gray-100 dark:border-neutral-800 mt-2">
                    <div className="h-6 bg-gray-100 dark:bg-neutral-800 rounded w-1/2 animate-pulse" />
                </div>
            </div>
        </div>
    )
}
