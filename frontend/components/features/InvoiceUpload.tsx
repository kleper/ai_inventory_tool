"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

export function InvoiceUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setIsUploading(true);

        // Simulate upload delay
        setTimeout(() => {
            setIsUploading(false);
            alert("Invoice uploaded (Mock)!");
        }, 1500);
    };

    return (
        <div className="w-full">
            <div
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors ${isDragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 hover:border-gray-400 dark:border-neutral-700 dark:hover:border-neutral-600 bg-gray-50 dark:bg-zinc-900/50"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <p className="text-lg font-medium">Processing Invoice...</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 bg-white dark:bg-neutral-800 rounded-full mb-4 shadow-sm">
                            <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Upload Invoice</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs mb-4">
                            Drag PDF or Image here
                        </p>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            Select File
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
