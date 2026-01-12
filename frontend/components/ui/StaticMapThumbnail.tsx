
import React, { useState } from "react";
import { Loader2, MapPin } from "lucide-react";

interface StaticMapThumbnailProps {
    lat: number;
    lng: number;
    className?: string; // Additional classes
}

export function StaticMapThumbnail({ lat, lng, className = "" }: StaticMapThumbnailProps) {
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Using basic staticmap.openstreetmap.de as requested
    // Note: In production, consider Geoapify or Mapbox for reliability.
    const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=17&size=600x300&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

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

            {/* Error Fallback */}
            {isError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-200 text-neutral-500 p-4 text-center">
                    <MapPin className="w-8 h-8 mb-2 opacity-20" />
                    <span className="font-mono text-[10px] uppercase font-bold">Map Preview Unavailable</span>
                </div>
            ) : (
                <img
                    src={mapUrl}
                    alt={`Map location ${lat}, ${lng}`}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsError(true);
                        setIsLoading(false);
                    }}
                />
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
