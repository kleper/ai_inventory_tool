"use client";
import { AlertCircle, CheckCircle2, Clock, Tag, Box } from "lucide-react";
import { SecureImage } from "@/components/ui/SecureImage";
import { motion } from "framer-motion";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { useState } from "react";

interface Item {
    id: number;
    name: string;
    description?: string;
    category?: string;
    status: string; // pending_price, completed, processing
    imageUrl?: string;
    price?: number;
}

import { formatCurrency } from "@/lib/currency";

export function InventoryCard({ item, canEdit, currency }: { item: Item, canEdit?: boolean, currency?: string }) {
    // const [imageError, setImageError] = useState(false); // Managed by SecureImage now

    // Construct valid URL
    let imageUrl = item.imageUrl;
    if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = imageUrl.startsWith("/")
            ? `${API_BASE_URL}${imageUrl}`
            : `${API_BASE_URL}/${imageUrl}`;
    }

    return (
        <Link href={`/inventory/item/${item.id}`} className="block h-full w-full">
            <div
                className="group relative bg-white border border-black rounded-none shadow-none hover:bg-zinc-50 transition-colors duration-200 h-full w-full flex flex-row md:flex-col items-center md:items-start p-2 md:p-0 gap-3 md:gap-0"
            >
                {/* Image Area */}
                <div className="w-20 h-20 shrink-0 md:w-full md:h-auto md:aspect-square bg-zinc-50 border border-black md:border-x-0 md:border-t-0 md:border-b relative overflow-hidden rounded-none">
                    <SecureImage
                        itemId={item.id}
                        fallbackSrc={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        variant="thumbnail"
                    />

                    <div className="absolute top-1 right-1 md:top-2 md:right-2">
                        {item.status === 'pending_price' && (
                            <span className="bg-white/90 text-[10px] font-bold uppercase tracking-wider text-black border border-black px-1.5 py-0.5 rounded-none">
                                Pending
                            </span>
                        )}
                        {item.status === 'completed' && (
                            <span className="hidden md:inline-flex bg-white/90 text-[10px] font-bold uppercase tracking-wider text-black border border-black px-1.5 py-0.5 rounded-none">
                                Done
                            </span>
                        )}
                        {item.status === 'needs_review' && (
                            <span className="bg-white/90 text-[10px] font-bold uppercase tracking-wider text-black border border-black px-1.5 py-0.5 rounded-none">
                                Review
                            </span>
                        )}
                        {!['pending_price', 'completed', 'needs_review'].includes(item.status) && (
                            <span className="bg-white/90 text-[10px] font-bold uppercase tracking-wider text-black border border-black px-1.5 py-0.5 rounded-none animate-pulse">
                                ...
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 md:p-4 min-w-0 w-full flex flex-col justify-center md:justify-between h-full">
                    <div className="flex flex-col gap-1 md:gap-2">
                        <p className="hidden md:block text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-0.5 truncate">
                            {item.category || "Uncategorized"}
                        </p>
                        <h3 className="font-bold text-sm md:text-base text-black leading-tight truncate md:line-clamp-2 md:whitespace-normal">
                            {item.name || "Unknown Item"}
                        </h3>
                        <p className="md:hidden text-xs text-gray-600 uppercase font-mono tracking-tight truncate">
                            {item.category || "Item"} • ID:{item.id}
                        </p>
                    </div>

                    <div className="hidden md:flex items-center justify-between pt-3 mt-auto border-t border-transparent md:border-black/5">
                        {item.price ? (
                            <div className="flex items-center text-black font-mono font-bold">
                                <span className="text-sm border border-black px-1 bg-transparent">
                                    {formatCurrency(item.price, currency)}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center text-gray-400 text-xs font-mono">
                                <span>--.--</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Skeleton Component - Brutalist Style
export function InventoryCardSkeleton() {
    return (
        <div className="bg-white border border-black rounded-none h-full flex flex-row md:flex-col p-2 md:p-0 gap-3 md:gap-0">
            <div className="w-20 h-20 md:w-full md:aspect-square bg-zinc-100 border border-black md:border-none animate-pulse shrink-0" />
            <div className="md:p-4 space-y-2 flex-1 w-full">
                <div className="h-3 bg-zinc-100 w-1/3 animate-pulse" />
                <div className="h-4 bg-zinc-100 w-3/4 animate-pulse" />
            </div>
        </div>
    )
}
