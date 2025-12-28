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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-none shadow-none max-w-md w-full overflow-hidden border border-black">
                <div className="p-6">
                    <h2 className="text-lg font-bold mb-1 uppercase tracking-tight text-black">Verify AI Match ({currentIndex + 1}/{matches.length})</h2>
                    <p className="text-sm text-neutral-500 font-mono mb-6">
                        Please confirm if the inventory item matches the invoice item.
                    </p>

                    <div className="flex items-center justify-between space-x-4 mb-6">
                        {/* Left: Inventory Item */}
                        <div className="flex flex-col items-center flex-1 p-3 border border-black rounded-none bg-neutral-50">
                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">My Inventory</span>
                            <div className="w-12 h-12 bg-white border border-black rounded-none mb-2 flex items-center justify-center text-2xl">📦</div>
                            <p className="text-sm font-bold text-center text-black">Item #{currentMatch.inventory_item_id}</p>
                            <span className="mt-1 text-xs border border-black bg-white text-black px-2 py-0.5 rounded-none font-mono">Pending</span>
                        </div>

                        <ArrowRight className="w-6 h-6 text-black" />

                        {/* Right: Invoice Item */}
                        <div className="flex flex-col items-center flex-1 p-3 border border-black rounded-none bg-neutral-50">
                            <span className="text-xs font-bold uppercase tracking-widest text-black mb-2">Invoice</span>
                            <div className="w-12 h-12 bg-white border border-black rounded-none mb-2 flex items-center justify-center text-2xl">📄</div>
                            <p className="text-sm font-bold text-center truncate w-full" title={currentMatch.invoice_item_name}>{currentMatch.invoice_item_name}</p>
                            <p className="text-lg font-bold text-black font-mono">${currentMatch.matched_price}</p>
                        </div>
                    </div>

                    <div className="flex justify-between w-full gap-3">
                        <button
                            onClick={handleReject}
                            className="flex-1 flex items-center justify-center py-2 px-4 rounded-none text-sm font-bold uppercase tracking-wide text-destructive border border-destructive hover:bg-destructive hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4 mr-2" /> Reject
                        </button>

                        <button
                            onClick={handleConfirm}
                            className="flex-1 flex items-center justify-center py-2 px-4 rounded-none text-sm font-bold uppercase tracking-wide text-white bg-black border border-black hover:bg-neutral-800 transition-colors"
                        >
                            <Check className="w-4 h-4 mr-2" /> Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
