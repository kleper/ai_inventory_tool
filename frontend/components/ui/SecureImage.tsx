"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { API_BASE_URL } from "@/lib/config";
import { Image as ImageIcon, Loader2, Box } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    itemId: number;
    fallbackSrc?: string;
    alt: string;
    className?: string;
}

export function SecureImage({ itemId, fallbackSrc, alt, className, ...props }: SecureImageProps) {
    const { data: session } = useSession();
    const [src, setSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let isMounted = true;

        const fetchImage = async () => {
            // If we have a fallbackSrc that is NOT a blob/secure endpoint, maybe we show it first?
            // But here we want the secure image.
            setIsLoading(true);
            try {
                // Try to fetch from secure endpoint
                // We need the token. Assuming session has it or we rely on cookie proxy if set up.
                // The prompt specifically asks to send Authorization header.
                const token = (session as any)?.accessToken; // Adjust if token path differs

                const headers: HeadersInit = {};
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }

                const res = await fetch(`${API_BASE_URL}/api/v1/media/items/${itemId}/image`, {
                    headers
                });

                if (!res.ok) {
                    throw new Error("Failed to load image");
                }

                const blob = await res.blob();
                if (isMounted) {
                    objectUrl = URL.createObjectURL(blob);
                    setSrc(objectUrl);
                }
            } catch (err) {
                if (isMounted) {
                    setError(true);
                    // If fetch failed, strict security might mean we don't show anything, 
                    // or we fall back to provided src if it's a static asset?
                    // Usually fallbackSrc is a placeholder (like user provided placeholder).
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (itemId) {
            fetchImage();
        } else {
            setIsLoading(false);
            setError(true);
        }

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [itemId, session]);

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center bg-neutral-100 border border-black h-full w-full", className)}>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error || !src) {
        if (fallbackSrc) {
            return <img src={fallbackSrc} alt={alt} className={cn("rounded-none", className)} {...props} />;
        }
        return (
            <div className={cn("flex items-center justify-center bg-neutral-100 border border-black h-full w-full", className)}>
                <Box className="w-10 h-10 text-white opacity-20" />
            </div>
        );
    }

    return <img src={src} alt={alt} className={className} {...props} />;
}
