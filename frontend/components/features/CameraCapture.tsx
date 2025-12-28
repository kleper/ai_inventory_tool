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
        <div className="w-full flex flex-col items-center gap-4 font-mono">
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
                // Idle State - Wireframe
                <div
                    onClick={handleButtonClick}
                    className="w-full h-64 border border-dashed border-black bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer group flex flex-col items-center justify-center gap-6"
                >
                    <div className="p-4 bg-white text-black border border-black group-hover:scale-105 transition-transform rounded-none">
                        {isLoading ? <Loader2 className="animate-spin text-black" size={32} /> : <Camera size={32} className="text-black" />}
                    </div>
                    <div className="text-center space-y-2">
                        <span className="font-bold text-black text-lg uppercase tracking-wide block">Tap to Capture</span>
                        <span className="text-xs text-neutral-500 font-mono uppercase">Device Camera API</span>
                    </div>
                    <Button variant="outline" className="mt-2 border-black text-black hover:bg-black hover:text-white uppercase font-bold tracking-wide rounded-none">
                        Open Camera
                    </Button>
                </div>
            ) : (
                // Preview State - Wireframe
                <div className="w-full space-y-6">
                    <div className="relative w-full border border-black bg-neutral-100 aspect-video flex items-center justify-center p-1 shadow-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="text-black animate-spin" size={48} />
                                <span className="text-black font-mono uppercase tracking-widest animate-pulse">Processing...</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <Button
                            variant="destructive"
                            size="lg"
                            onClick={handleRetake}
                            className="flex-1 max-w-[200px] border-destructive rounded-none font-bold uppercase tracking-wide"
                            disabled={isLoading}
                        >
                            <X className="mr-2 h-5 w-5" />
                            Retake
                        </Button>
                        <Button
                            variant="default"
                            size="lg"
                            onClick={handleConfirm}
                            className="flex-1 max-w-[200px] bg-black text-white border-black hover:bg-neutral-800 rounded-none font-bold uppercase tracking-wide shadow-none"
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
