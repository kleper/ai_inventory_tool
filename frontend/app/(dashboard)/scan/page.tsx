"use client";

import { CameraCapture } from "@/components/features/CameraCapture";
import { useState } from "react";

export default function ScanPage() {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const handleCapture = (image: string) => {
        setCapturedImage(image);
        // Here we would upload the image to the backend
        console.log("Captured image length:", image.length);
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
                            onClick={() => {
                                alert("This would trigger the Process Object AI agent");
                                setCapturedImage(null);
                            }}
                        >
                            Analyze with AI
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
