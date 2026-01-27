"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { CameraCapture } from "@/components/features/CameraCapture";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface ItemGalleryUploaderProps {
    itemId: number;
    currentCount: number;
    maxImages?: number;
    onUpdate: () => void;
    canWrite: boolean;
}

export function ItemGalleryUploader({ itemId, currentCount, maxImages = 5, onUpdate, canWrite }: ItemGalleryUploaderProps) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    if (!canWrite) return null;

    const isFull = currentCount >= maxImages;

    const handleCapture = async (base64Image: string) => {
        if (isFull) {
            toast.error("GALLERY FULL (MAX 5 IMAGES)");
            return;
        }

        setIsUploading(true);
        try {
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const file = new File([blob], "gallery.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("file", file);

            const token = (session as any)?.accessToken;
            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}/images`, {
                method: "POST",
                headers,
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error(err.detail || "Failed to upload image");
            }

            toast.success("PHOTO ADDED TO GALLERY");
            setIsOpen(false);
            onUpdate();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add photo");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isFull}
                    className="border-black rounded-none uppercase font-bold tracking-wide text-xs hover:bg-black hover:text-white"
                >
                    <ImagePlus className="w-4 h-4 mr-2" /> {isFull ? "Gallery Full" : "Add Photo"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border border-black shadow-none rounded-none bg-white p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col gap-4">
                    <DialogTitle className="text-xl font-bold uppercase tracking-tighter border-b-2 border-black pb-2">
                        Add Gallery Photo
                    </DialogTitle>
                    <DialogDescription className="text-xs font-mono text-neutral-500 uppercase">
                        Up to {maxImages} images per item. {currentCount}/{maxImages} used.
                    </DialogDescription>
                    {isFull ? (
                        <div className="border border-black bg-neutral-50 p-6 text-center">
                            <p className="text-xs font-mono uppercase text-neutral-500">
                                Gallery limit reached. Remove an image to add more.
                            </p>
                        </div>
                    ) : isUploading ? (
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
