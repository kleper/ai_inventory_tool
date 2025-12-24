"use client";

import { useState, useRef } from "react";
import { Camera, Check, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
    onCapture: (image: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            // Create object URL for immediate preview
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            setIsLoading(false);
        }
    };

    const handleRetake = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleConfirm = () => {
        if (!fileInputRef.current?.files?.[0]) return;

        setIsLoading(true);
        const file = fileInputRef.current.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64String = reader.result as string;
            onCapture(base64String);
            // Cleanup and reset is optional, but depends on UX. 
            // Invoking onCapture usually submits the form or adds the item.
            // We'll keep the preview until the parent unmounts or resets us, 
            // but let's clear loading.
            setIsLoading(false);
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className="w-full flex flex-col items-center gap-4">
            {/* Hidden Input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {!previewUrl ? (
                // Idle State
                <div
                    onClick={handleButtonClick}
                    className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group"
                >
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        {isLoading ? <Loader2 className="animate-spin" size={32} /> : <Camera size={32} />}
                    </div>
                    <div className="text-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200 block text-lg">Tap to Capture Object</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Takes a photo with device camera</span>
                    </div>
                    <Button variant="outline" className="mt-2">
                        Open Camera
                    </Button>
                </div>
            ) : (
                // Preview State
                <div className="w-full space-y-4">
                    <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="text-white animate-spin" size={48} />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <Button
                            variant="destructive"
                            size="lg"
                            onClick={handleRetake}
                            className="flex-1 max-w-[150px]"
                            disabled={isLoading}
                        >
                            <X className="mr-2 h-5 w-5" />
                            Retake
                        </Button>
                        <Button
                            variant="default"
                            size="lg"
                            onClick={handleConfirm}
                            className="flex-1 max-w-[150px] bg-green-600 hover:bg-green-700"
                            disabled={isLoading}
                        >
                            <Check className="mr-2 h-5 w-5" />
                            Use Photo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
