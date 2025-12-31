"use client";

import { InvoiceUpload } from "@/components/features/InvoiceUpload";

export default function InvoicesPage() {
    return (

        <div className="max-w-4xl mx-auto space-y-8 p-6 min-h-screen bg-white text-black">
            <div className="border-b border-black pb-6">
                <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight text-black">Invoices</h1>
                <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
                    Match invoices with inventory items.
                </p>
            </div>

            <div className="bg-white p-6 border border-black rounded-none shadow-none">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black pb-2 text-black">Upload New Invoice</h2>
                <InvoiceUpload onFileSelect={(file) => alert(`Uploading ${file.name} (Mock)`)} />
            </div>

            <div className="bg-white border border-black rounded-none shadow-none">
                <div className="px-6 py-4 border-b border-black bg-white">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black">Recent Uploads</h2>
                </div>
                <div className="divide-y divide-black">
                    {/* Mock list */}
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white rounded-none flex items-center justify-center font-bold text-xs border border-black">
                                    PDF
                                </div>
                                <div>
                                    <p className="font-bold text-sm uppercase tracking-wide text-black">Invoice_{202400 + i}.pdf</p>
                                    <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-1">Uploaded 2h ago</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-white text-black px-3 py-1 border border-black font-bold uppercase tracking-wider rounded-none">
                                Processed
                            </span>
                        </div>
                    ))}
                    {[1, 2].length === 0 && (
                        <div className="p-8 text-center text-neutral-500 font-mono text-sm uppercase">
                            No invoices found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
