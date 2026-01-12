"use client";

import { useUploadQueue, QueueItem } from "@/context/UploadQueueContext";
import { Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface QueueTabProps {
    groupId: string;
}

export function QueueTab({ groupId }: QueueTabProps) {
    const { queue, retryItem, removeItem } = useUploadQueue();
    const groupItems = queue.filter(item => item.groupId === groupId);

    if (groupItems.length === 0) {
        return (
            <div className="text-center py-20 bg-neutral-50 border border-black border-dashed m-6">
                <p className="text-neutral-500 font-mono uppercase text-sm">No items in processing queue.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto py-6 px-4">
            <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                Processing Queue ({groupItems.length})
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </h3>

            <div className="space-y-3">
                {groupItems.map((item) => (
                    <QueueItemCard
                        key={item.tempId}
                        item={item}
                        onRetry={() => retryItem(item.tempId)}
                        onRemove={() => removeItem(item.tempId)}
                    />
                ))}
            </div>
        </div>
    );
}

function QueueItemCard({ item, onRetry, onRemove }: { item: QueueItem, onRetry: () => void, onRemove: () => void }) {
    return (
        <div className="bg-white border border-black p-3 flex items-center gap-4 relative overflow-hidden group">
            {/* Progress Bar Background */}
            {item.status !== 'ERROR' && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-black transition-all duration-500"
                    style={{ width: `${item.progress}%` }}
                />
            )}

            {/* Thumbnail */}
            <div className="w-16 h-16 shrink-0 bg-neutral-100 border border-black relative">
                <img
                    src={item.thumbnailUrl}
                    alt="Queue item"
                    className="w-full h-full object-cover grayscale"
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">ID: {item.tempId.slice(0, 8)}</span>
                    <button onClick={onRemove} className="text-black hover:bg-neutral-100 p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                    </button>
                </div>

                <div className="mt-1">
                    {/* Status Logic */}
                    {item.status === 'PENDING' && (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                            <Loader2 className="w-3 h-3 animate-spin" /> Pending...
                        </div>
                    )}
                    {item.status === 'UPLOADING' && (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                        </div>
                    )}
                    {item.status === 'ANALYZING' && (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-600">
                            <Loader2 className="w-3 h-3 animate-spin" /> AI Analyzing...
                        </div>
                    )}
                    {item.status === 'COMPLETED' && (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-600">
                            <CheckCircle2 className="w-3 h-3" /> Finished
                        </div>
                    )}
                    {item.status === 'ERROR' && (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-600">
                                <AlertCircle className="w-3 h-3" /> Failed
                            </div>
                            <span className="text-[10px] font-mono text-red-500 truncate">{item.error}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRetry}
                                className="h-6 mt-1 w-fit text-[10px] rounded-none border-red-600 text-red-600 hover:bg-red-50 uppercase"
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
