"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

export function InvoiceUpload({ onFileSelect }: { onFileSelect: (file: File) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    // Remove local isUploading state if controlled by parent, or keep for UI feedback?
    // Parent handles API call, so maybe parent sets loading state?
    // For simplicity, let's keep UI simple here and assume parent handles loading feedback globally or via toast.

    // Actually, dragging state is local.

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

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <div
                className={`flex flex-col items-center justify-center w-full h-64 border border-dashed border-black transition-colors rounded-none ${isDragging
                    ? "bg-neutral-50"
                    : "bg-white hover:bg-neutral-50"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="p-4 bg-black text-white rounded-none mb-4 border border-black">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-widest mb-1 text-black">Upload Invoice</h3>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest max-w-xs mb-6 text-center">
                        Drag PDF or Image here
                    </p>
                    <label className="cursor-pointer px-6 py-3 bg-black text-white border border-black text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors rounded-none">
                        Select File
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                    </label>
                </div>
            </div>
        </div>
    );
}
