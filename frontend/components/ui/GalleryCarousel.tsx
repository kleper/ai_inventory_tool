"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureImage } from "@/components/ui/SecureImage";
import { cn } from "@/lib/utils";

interface GalleryCarouselProps {
    mode: "secure" | "public";
    items: string[];
    itemId?: number;
    altBase: string;
    className?: string;
    children?: ReactNode;
}

export function GalleryCarousel({ mode, items, itemId, altBase, className, children }: GalleryCarouselProps) {
    const sanitizedItems = useMemo(() => items.filter((value) => typeof value === "string" && value.trim().length > 0), [items]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (sanitizedItems.length === 0) {
            setActiveIndex(0);
            return;
        }
        setActiveIndex((prev) => Math.min(prev, sanitizedItems.length - 1));
    }, [sanitizedItems.length]);

    const hasMultiple = sanitizedItems.length > 1;
    const isSecure = mode === "secure" && typeof itemId === "number";

    const handlePrev = () => {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
    };

    const handleNext = () => {
        setActiveIndex((prev) => Math.min(prev + 1, sanitizedItems.length - 1));
    };

    return (
        <div className={cn("bg-neutral-50", className)}>
            <div className="relative overflow-hidden aspect-square bg-neutral-50">
                {sanitizedItems.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-neutral-300">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs font-mono uppercase">No images available</span>
                    </div>
                ) : (
                    <div
                        className="flex h-full w-full transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                        {sanitizedItems.map((src, index) => (
                            <div key={`${src}-${index}`} className="min-w-full h-full">
                                {mode === "secure" ? (
                                    isSecure ? (
                                        <SecureImage
                                            itemId={itemId}
                                            imageFilename={src}
                                            alt={`${altBase} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            variant="thumbnail"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-neutral-300">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={src}
                                        alt={`${altBase} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {children}
            </div>
            <div className="flex items-center justify-between border-t border-black bg-white px-3 py-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={!hasMultiple || activeIndex === 0}
                    className="border-black rounded-none uppercase font-bold tracking-wide text-[10px]"
                    aria-label="Previous image"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <span className="text-[10px] font-mono uppercase text-neutral-500">
                    {sanitizedItems.length === 0 ? "0 / 0" : `${activeIndex + 1} / ${sanitizedItems.length}`}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasMultiple || activeIndex === sanitizedItems.length - 1}
                    className="border-black rounded-none uppercase font-bold tracking-wide text-[10px]"
                    aria-label="Next image"
                >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
