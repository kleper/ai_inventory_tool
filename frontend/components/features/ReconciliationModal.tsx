"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";

export function ReconciliationModal() {
    const { lastMessage } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (lastMessage?.type === "invoice_processed") {
            setMatches(lastMessage.data.matches);
            if (lastMessage.data.matches && lastMessage.data.matches.length > 0) {
                setIsOpen(true);
            }
        }
    }, [lastMessage]);

    const currentMatch = matches[currentIndex];

    const handleConfirm = () => {
        if (currentIndex < matches.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsOpen(false);
        }
    };

    const handleReject = () => {
        if (currentIndex < matches.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsOpen(false);
        }
    };

    if (!isOpen || !currentMatch) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-neutral-800">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-1">Verify AI Match ({currentIndex + 1}/{matches.length})</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Please confirm if the inventory item matches the invoice item.
                    </p>

                    <div className="flex items-center justify-between space-x-4 mb-6">
                        {/* Left: Inventory Item */}
                        <div className="flex flex-col items-center flex-1 p-3 border rounded-lg bg-gray-50 dark:bg-white/5 dark:border-white/10">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">My Inventory</span>
                            <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-full mb-2 flex items-center justify-center text-2xl">📦</div>
                            <p className="text-sm font-medium text-center">Item #{currentMatch.inventory_item_id}</p>
                            <span className="mt-1 text-xs border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Pending</span>
                        </div>

                        <ArrowRight className="w-6 h-6 text-gray-400" />

                        {/* Right: Invoice Item */}
                        <div className="flex flex-col items-center flex-1 p-3 border rounded-lg border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">Invoice</span>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full mb-2 flex items-center justify-center text-2xl">📄</div>
                            <p className="text-sm font-medium text-center truncate w-full" title={currentMatch.invoice_item_name}>{currentMatch.invoice_item_name}</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">${currentMatch.matched_price}</p>
                        </div>
                    </div>

                    <div className="flex justify-between w-full gap-3">
                        <button
                            onClick={handleReject}
                            className="flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <X className="w-4 h-4 mr-2" /> Reject
                        </button>

                        <button
                            onClick={handleConfirm}
                            className="flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Check className="w-4 h-4 mr-2" /> Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
