"use client";

import { CameraCapture } from "@/components/features/CameraCapture";
import { useState } from "react";

export default function ScanPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const handleCapture = (image: string) => {
        setCapturedImage(image);
    };

    const processImage = async () => {
        if (!capturedImage) return;

        try {
            setIsUploading(true);

            // Convert base64 to blob
            const response = await fetch(capturedImage);
            const blob = await response.blob();
            const file = new File([blob], "captured_item.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("file", file);

            // TODO: Get auth token if needed, or rely on cookie/session if configured
            // Assuming the simple auth setup or proxy is handling it, but usually we need headers.
            // For this codebase, let's assume standard fetch with Authorization header if we had the context,
            // but checking other files suggests we might need to handle auth token retrieval.
            // Using a simple fetch for now.
            const token = localStorage.getItem("token"); // Naive token retrieval

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/inventory/process-object`, {
                method: "POST",
                headers: {
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Failed to process image");
            }

            const data = await res.json();
            console.log("Item processed:", data);
            alert(`Item "${data.name}" added! Price: ${data.price || 'Pending'}`);
            setCapturedImage(null);

        } catch (error) {
            console.error("Error processing image:", error);
            alert("Error processing image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Scan New Item</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Take a photo of an object to add it to your inventory automatically.
                </p>
            </div>

            <CameraCapture onCapture={handleCapture} />

            {capturedImage && (
                <div className="p-4 border border-gray-200 dark:border-neutral-800 rounded-lg">
                    <h3 className="font-semibold mb-2">Preview</h3>
                    <img src={capturedImage} alt="Captured" className="w-full rounded-md" />
                    <div className="mt-4 flex gap-2">
                        <button
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                            onClick={processImage}
                            disabled={isUploading}
                        >
                            {isUploading ? "Analyzing..." : "Analyze with AI"}
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-200 dark:bg-neutral-800 rounded-lg font-medium"
                            onClick={() => setCapturedImage(null)}
                        >
                            Retake
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
