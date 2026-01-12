import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface Location {
    lat: number;
    lng: number;
}

interface GeolocationState {
    location: Location | null;
    loading: boolean;
    error: string | null;
    getLocation: () => void;
}

export const useGeolocation = (enabled: boolean = false): GeolocationState => {
    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getLocation = useCallback(() => {
        if (!enabled) return;

        // HTTPS Check
        if (typeof window !== "undefined" && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            const msg = "GPS requires HTTPS. Please secure your connection.";
            setError(msg);
            toast.error(msg);
            return;
        }

        if (!("geolocation" in navigator)) {
            const msg = "Geolocation not supported by this browser.";
            setError(msg);
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                let msg = "Unknown GPS error";
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        msg = "GPS Permission Denied. Please enable location access.";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        msg = "GPS Signal Unavailable.";
                        break;
                    case err.TIMEOUT:
                        msg = "GPS Timeout.";
                        break;
                }
                setError(msg);
                toast.error(msg);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }, [enabled]);

    // Auto-trigger if enabled changes to true
    useEffect(() => {
        if (enabled && !location && !loading && !error) {
            getLocation();
        }
    }, [enabled, getLocation, location, loading, error]);

    return { location, loading, error, getLocation };
};
