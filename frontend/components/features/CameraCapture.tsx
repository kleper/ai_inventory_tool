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
                // Preview State - Brutalist Wireframe
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm bg-white border border-black shadow-none rounded-none overflow-hidden">
                        {/* Header */}
                        <div className="py-3 border-b border-black bg-white text-center">
                            <h3 className="font-bold text-black uppercase tracking-widest text-sm">Confirm Photo</h3>
                        </div>

                        {/* Image */}
                        <div className="relative w-full aspect-[4/3] bg-zinc-50 border-b border-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-contain mix-blend-multiply"
                            />
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-4 z-10">
                                    <Loader2 className="text-black animate-spin" size={32} />
                                    <span className="text-black font-mono uppercase tracking-widest text-xs animate-pulse">Processing...</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="grid grid-cols-2 gap-px bg-black border-t-0">
                            {/* gap-px with bg-black simulates shared border if items are white, 
                               but here we want strict 1px. Simple grid with -ml-px might work or just normal grid.
                               Prompt says: gap-[-1px]
                            */}
                            <div className="flex">
                                <button
                                    onClick={handleRetake}
                                    disabled={isLoading}
                                    className="w-full bg-white text-black font-medium uppercase tracking-widest py-4 hover:bg-zinc-100 disabled:opacity-50 transition-colors rounded-none flex items-center justify-center gap-2 border-none"
                                >
                                    <X className="w-4 h-4" /> Retake
                                </button>
                            </div>
                            <div className="flex border-l border-black">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading}
                                    className="w-full bg-black text-white font-medium uppercase tracking-widest py-4 hover:bg-zinc-900 disabled:opacity-50 transition-colors rounded-none flex items-center justify-center gap-2 border-none"
                                >
                                    <Check className="w-4 h-4" /> Use Photo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
