"use client";

import { InvoiceUpload } from "@/components/features/InvoiceUpload";

export default function InvoicesPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Invoices</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Upload invoices to match them with existing inventory items.
                </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Upload New Invoice</h2>
                <InvoiceUpload onFileSelect={(file) => alert(`Uploading ${file.name} (Mock)`)} />
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">Recent Uploads</h2>
                <div className="space-y-4">
                    {/* Mock list */}
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-neutral-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center text-red-600">
                                    PDF
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Invoice_{202400 + i}.pdf</p>
                                    <p className="text-xs text-gray-500">Uploaded 2 hours ago</p>
                                </div>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Processed</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
