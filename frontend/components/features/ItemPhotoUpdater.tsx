"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { CameraCapture } from "@/components/features/CameraCapture";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface ItemPhotoUpdaterProps {
    itemId: number;
    onUpdate: () => void;
    canWrite: boolean;
}

export function ItemPhotoUpdater({ itemId, onUpdate, canWrite }: ItemPhotoUpdaterProps) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    if (!canWrite) return null;

    const handleCapture = async (base64Image: string) => {
        setIsUploading(true);
        try {
            // Convert base64 to blob
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("file", file);

            const token = (session as any)?.accessToken;
            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}/image`, {
                method: "PUT",
                headers, // do NOT set Content-Type for FormData, browser does it
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.detail || "Failed to upload image");
            }

            toast.success("PHOTO UPDATED SUCCESSFULLY");
            setIsOpen(false);
            onUpdate(); // Trigger refresh in parent
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update photo");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    className="absolute bottom-4 right-4 z-10 border border-black rounded-none font-bold uppercase tracking-wider bg-white text-black hover:bg-black hover:text-white transition-all shadow-none"
                >
                    <Camera className="w-4 h-4 mr-2" />
                    CHANGE PHOTO
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border border-black shadow-none rounded-none bg-white p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col gap-4">
                    <DialogTitle className="text-xl font-bold uppercase tracking-tighter border-b-2 border-black pb-2">
                        Replace Item Photo
                    </DialogTitle>
                    <DialogDescription className="text-xs font-mono text-neutral-500 uppercase">
                        Upload a new image for this item using the camera or file selector.
                    </DialogDescription>
                    {isUploading ? (
                        <div className="flex items-center justify-center p-8 flex-col gap-4">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono font-bold text-lg">UPLOADING...</span>
                        </div>
                    ) : (
                        <CameraCapture onCapture={handleCapture} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
