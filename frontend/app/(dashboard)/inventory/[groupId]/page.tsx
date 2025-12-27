"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { InventoryCard, InventoryCardSkeleton } from "@/components/features/InventoryCard";
import { CameraCapture } from "@/components/features/CameraCapture";
import { API_BASE_URL } from "@/lib/config";
import { InvoiceUpload } from "@/components/features/InvoiceUpload";
import { ManualItemDialog } from "@/components/features/ManualItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareModal } from "@/components/features/ShareModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, ArrowLeft, Camera, Upload, PenTool, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FolderDetailPage() {
    const params = useParams();
    const groupId = params.groupId as string;
    useNotifications(); // Ensure WS is connected

    // Fetch Group Details for Header
    // TODO: Ideally we should have a single endpoint for group details, but we can reuse the list for now or assume name is static if not fetched yet?
    // Let's assume we need a name. For now, we'll fetch items and generic info.

    // Fetch Items
    const { data: items, error, isLoading, mutate } = useSWR(
        groupId ? `${API_BASE_URL}/api/v1/inventory/items?group_id=${groupId}` : null,
        fetcher
    );

    // Fetch Group Info
    const { data: group } = useSWR(
        groupId ? `${API_BASE_URL}/api/v1/groups/${groupId}` : null,
        fetcher
    );

    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Permission Logic
    const role = group?.my_role || "VIEWER";
    const canWrite = role === "OWNER" || role === "EDITOR";
    const isOwner = role === "OWNER";

    const handleCapture = async (imageSrc: string) => {
        setIsScanOpen(false);
        toast.info("Procesando imagen en segundo plano...");
        setIsProcessing(true);
        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("group_id", groupId);

            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/process-object?group_id=${groupId}`, {
                method: "POST",
                headers: { authorization: `Bearer ${(session as any)?.accessToken}` }, // Add Auth
                body: formData
            });

            if (!apiRes.ok) throw new Error("Processing failed");
            toast.success("Item processed!");
            mutate();
        } catch (err) {
            toast.error("Error processing object");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInvoiceUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/match-invoice?user_id=1&group_id=${groupId}`, {
                method: "POST",
                body: formData
            });
            if (!apiRes.ok) throw new Error("Upload failed");
            toast.success("Invoice uploaded");
        } catch (err) {
            toast.error("Error uploading invoice");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredItems = items?.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupName = group?.name || `Folder #${groupId}`;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="bg-card border-b p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/inventory" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> My Inventories
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-foreground">{groupName}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{groupName}</h1>
                            {group?.is_shared && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-100 flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Shared
                                </span>
                            )}
                            {!canWrite && (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-300">
                                    Read-only
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Share Button: Only Owner */}
                            {isOwner && (
                                <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)} className="text-muted-foreground hover:text-indigo-600">
                                    <UserPlus className="w-5 h-5" />
                                </Button>
                            )}

                            {/* Actions - Only if Write access */}
                            {canWrite && (
                                <>
                                    <div className="md:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" className="gap-2">
                                                    Actions <Plus className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => setIsScanOpen(true)}>Scan Item</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setIsUploadOpen(true)}>Upload Invoice</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setIsManualOpen(true)}>Add Manually</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2">
                                        <Button onClick={() => setIsScanOpen(true)} className="gap-2">
                                            <Camera className="w-4 h-4" /> Scan Item
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="gap-2">
                                            <Upload className="w-4 h-4" /> Upload Invoice
                                        </Button>
                                        <ManualItemDialog groupId={groupId} onSuccess={() => mutate()} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Dialogs */}
                    {canWrite && (
                        <>
                            <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader><DialogTitle>Scan Item</DialogTitle></DialogHeader>
                                    <CameraCapture onCapture={handleCapture} />
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader><DialogTitle>Upload Invoice</DialogTitle></DialogHeader>
                                    <InvoiceUpload onFileSelect={handleInvoiceUpload} />
                                </DialogContent>
                            </Dialog>
                            {isManualOpen && <ManualItemDialog groupId={groupId} onSuccess={() => { mutate(); setIsManualOpen(false); }} open={true} onOpenChange={setIsManualOpen} showTrigger={false} />}
                        </>
                    )}

                    <ShareManagerModal
                        open={isShareOpen}
                        onOpenChange={setIsShareOpen}
                        groupId={groupId}
                        groupName={groupName}
                        isOwner={isOwner}
                    />

                    {/* Filters */}
                    <div className="flex items-center gap-3 pt-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-muted/20">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <InventoryCardSkeleton key={i} />)}
                        </div>
                    ) : (!filteredItems || filteredItems.length === 0) ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">No items found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredItems.map((item: any) => (
                                <InventoryCard
                                    key={item.id}
                                    item={item}
                                    canEdit={canWrite} // Pass new prop to disable edit buttons
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
