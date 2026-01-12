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

// DEEP DEBUG MODE
export const useGeolocation = (enabled: boolean = false): GeolocationState => {
    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getLocation = useCallback(() => {
        // Validation Barriers
        if (!enabled) {
            console.log("GPS: Hook disabled. Skipping.");
            return;
        }

        if (typeof window === "undefined") return;

        console.log("GPS: Checking requirements...");

        // HTTPS Barrier
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            const msg = "GPS Safety Error: Requires HTTPS.";
            console.error(msg);
            setError(msg);
            toast.error(msg);
            return;
        }

        // Feature Barrier
        if (!("geolocation" in navigator)) {
            const msg = "GPS System Error: Geolocation API not supported.";
            console.error(msg);
            setError(msg);
            toast.error(msg);
            return;
        }

        // Start Acquisition
        console.log("GPS: Requesting position from satellites...");
        setLoading(true);
        setError(null);

        const options = {
            enableHighAccuracy: true, // Force GPS hardware
            timeout: 20000,           // 20s (Mobile cold start can take 10-15s)
            maximumAge: 0             // Do not accept cached position
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`GPS: LOCKED ✅. Lat: ${latitude}, Lng: ${longitude}, Acc: ${accuracy}m`);

                setLocation({
                    lat: latitude,
                    lng: longitude
                });
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                let msg = "Unknown GPS error";
                const detailedCode = `Error Code: ${err.code} (${err.message})`;
                console.error(`GPS: FAILED ❌. ${detailedCode}`);

                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        msg = "GPS Denied: Allow location permission in browser settings.";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        msg = "GPS Signal Lost: Cannot determine location.";
                        break;
                    case err.TIMEOUT:
                        msg = "GPS Timeout: Satellites took too long (20s). Try moving outside.";
                        break;
                }
                setError(msg);
                toast.error(msg);
            },
            options
        );
    }, [enabled]);

    // Cleanup & Trigger
    useEffect(() => {
        let mounted = true;
        if (enabled && !location && !loading && !error) {
            getLocation();
        }
        return () => { mounted = false; };
    }, [enabled, getLocation, location, loading, error]);

    return { location, loading, error, getLocation };
};
