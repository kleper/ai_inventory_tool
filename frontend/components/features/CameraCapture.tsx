"use client";

import { useState, useRef } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export function CameraCapture({ onCapture }: { onCapture: (image: string) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isActive, setIsActive] = useState(false);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            // Fallback for some devices or if high res fails
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false
                });
                setStream(fallbackStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
                setIsActive(true);
            } catch (retryErr) {
                console.error("Retry failed:", retryErr);
                alert("Could not access camera. Please check permissions.");
            }
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const image = canvas.toDataURL("image/jpeg");
                onCapture(image);
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsActive(false);
        }
    };

    return (
        <div className="w-full">
            {!isActive ? (
                <button
                    onClick={startCamera}
                    className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                        <Camera size={32} />
                    </div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Tap to Capture Object</span>
                </button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-xl overflow-hidden bg-black"
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto max-h-[60vh] object-cover"
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                        <button
                            onClick={stopCamera}
                            className="p-3 bg-red-500 rounded-full text-white shadow-lg"
                        >
                            <RefreshCw size={24} />
                        </button>
                        <button
                            onClick={capturePhoto}
                            className="p-4 bg-white rounded-full text-black shadow-lg border-4 border-gray-200"
                        >
                            <div className="w-4 h-4 bg-black rounded-full" />
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
