import React, { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface StaticMapThumbnailProps {
    lat: number;
    lng: number;
    mapImage?: string | null;
    itemId?: number; // Added itemId for fallback
    className?: string;
}

export function StaticMapThumbnail({ lat, lng, mapImage, itemId, className = "" }: StaticMapThumbnailProps) {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Determine Image Source
    let imageUrl = "";
    if (mapImage) {
        imageUrl = mapImage.startsWith("http") ? mapImage : `${API_BASE_URL}${mapImage}`;
    } else if (itemId) {
        // Fallback: Try to load the backend generated image directly using the predictable path convention
        // This handles cases where DB update hasn't propagated to frontend yet but file exists
        imageUrl = `${API_BASE_URL}/api/v1/media/maps/map_${itemId}.png`;
        // Wait, backend saves as "map_{item_id}.png" in /app/media/maps
        // Served at /media/maps/map_{item_id}.png
        // Proxied at /api/proxy/media/maps/map_{item_id}.png? 
        // My proxy rule is /media/:path* -> http://backend:8000/media/:path*
        // So frontend URL should be /media/maps/map_{item_id}.png
        // But API_BASE_URL is /api/proxy usually?
        // Let's use the /media proxy rule I added.
        imageUrl = `/media/maps/map_${itemId}.png`;
    } else {
        imageUrl = mapboxToken
            ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+000000(${lng},${lat})/${lng},${lat},15,0/600x320?access_token=${mapboxToken}&attribution=true&logo=false`
            : "";
    }

    // Initialize loading
    // If we are using fallback itemId, we assume it *might* exist.
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    // Effect to update loading state
    React.useEffect(() => {
        setIsLoading(true); // Always start loading when props change
        setIsError(false);
    }, [imageUrl]);

    return (
        <div className={`relative border border-black bg-neutral-100 overflow-hidden ${className}`} style={{ minHeight: '150px' }}>
            {/* Loading State */}
            {isLoading && !isError && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10 transition-opacity">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-black" />
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">Loading Map...</span>
                    </div>
                </div>
            )}

            {/* Content */}
            {!isError ? (
                <img
                    src={imageUrl}
                    alt={`Map location ${lat}, ${lng}`}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => {
                        console.log("Map Load Error (Fallback likely failed):", imageUrl);
                        // If fallback failed, AND we have no mapbox token, then it's a real error.
                        // If we have mapbox token, we could fallback to that? 
                        // Too complex. Just show error.
                        setIsError(true);
                        setIsLoading(false);
                    }}
                />
            ) : (
                /* Error / Missing Config State */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-200 text-neutral-500 p-4 text-center z-0">
                    <MapPin className="w-8 h-8 mb-2 opacity-20" />
                    <span className="font-mono text-[10px] uppercase font-bold text-red-500">
                        Map Load Failed
                    </span>
                    {!mapboxToken && !mapImage && <span className="text-[10px] text-red-500 mt-1">Check Backend Logs</span>}
                </div>
            )}

            {/* Brutalist Button Overlay */}
            <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-white border border-black px-2 py-1 text-[10px] font-bold uppercase hover:bg-black hover:text-white transition-colors z-20 flex items-center gap-1 shadow-sm"
            >
                <MapPin className="w-3 h-3" /> Open GPS
            </a>
        </div>
    );
}
