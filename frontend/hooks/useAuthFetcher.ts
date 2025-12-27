"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

export function useAuthFetcher() {
    const { data: session } = useSession();

    return useCallback(async (url: string) => {
        const token = (session as any)?.accessToken;
        const headers: HeadersInit = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
            // Include status code in error to allow SWR to handle it potentially
            const error: any = new Error("An error occurred while fetching the data.");
            error.info = await res.json().catch(() => ({}));
            error.status = res.status;
            throw error;
        }
        return res.json();
    }, [session]); // Re-create fetcher when session changes
}
