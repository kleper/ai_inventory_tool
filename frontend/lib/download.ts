import { API_BASE_URL } from "@/lib/config";

export async function downloadSecureFile(url: string, filename: string, token: string) {
    try {
        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Download failed");

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename; // This might be overridden by Content-Disposition, but good fallback
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);

    } catch (error) {
        console.error("Secure download failed", error);
        throw error;
    }
}
