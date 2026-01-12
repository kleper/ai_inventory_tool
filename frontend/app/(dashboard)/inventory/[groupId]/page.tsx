"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { InventoryCard, InventoryCardSkeleton } from "@/components/features/InventoryCard";
import { SecureImage } from "@/components/ui/SecureImage";
import { CameraCapture } from "@/components/features/CameraCapture";
import { API_BASE_URL } from "@/lib/config";
import { InventoryAnalyticsTab } from "@/components/features/InventoryAnalyticsTab";
import { InvoiceUpload } from "@/components/features/InvoiceUpload";
import { ManualItemDialog } from "@/components/features/ManualItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareManagerModal } from "@/components/features/ShareManagerModal";
import { useSession } from "next-auth/react";
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
import { formatCurrency } from "@/lib/currency"; // Import Utils
import { CreateUpdateFolderModal } from "@/components/features/CreateUpdateFolderModal"; // Import Modal

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
// fetcher removed

export default function FolderDetailPage() {
    const params = useParams();
    const groupId = params.groupId as string;
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;
    useNotifications(); // Ensure WS is connected

    // Fetch Items
    const { data: items, error, isLoading, mutate } = useSWR(
        (groupId && token) ? `${API_BASE_URL}/api/v1/inventory/items?group_id=${groupId}` : null,
        fetcher
    );

    // Fetch Group Info
    const { data: group } = useSWR(
        (groupId && token) ? `${API_BASE_URL}/api/v1/groups/${groupId}` : null,
        fetcher
    );

    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false); // Edit State

    const [activeTab, setActiveTab] = useState<'items' | 'analytics'>('items');

    // Permission Logic
    const role = group?.my_role || "VIEWER";
    const canWrite = role === "OWNER" || role === "EDITOR";
    const isOwner = role === "OWNER";

    const handleCapture = async (imageSrc: string) => {
        setIsScanOpen(false);
        toast.info("Processing image...");
        setIsProcessing(true);

        const uploadImage = async (lat?: number, lng?: number) => {
            try {
                const res = await fetch(imageSrc);
                const blob = await res.blob();
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                const formData = new FormData();
                formData.append("file", file);
                formData.append("group_id", groupId);

                if (lat !== undefined && lng !== undefined) {
                    formData.append("latitude", lat.toString());
                    formData.append("longitude", lng.toString());
                    console.log("Adding GPS to upload:", lat, lng);
                }

                const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/process-object?group_id=${groupId}`, {
                    method: "POST",
                    headers: { authorization: `Bearer ${(session as any)?.accessToken}` },
                    body: formData
                });

                if (!apiRes.ok) throw new Error("Processing failed");
                toast.success("Item processed successfully!");
                mutate();
            } catch (err) {
                console.error(err);
                toast.error("Error processing object");
            } finally {
                setIsProcessing(false);
            }
        };

        // Check if Geolocation is enabled for this group
        if (group?.settings?.enable_geolocation && "geolocation" in navigator) {
            toast.info("Acquiring GPS location...");
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    uploadImage(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.error("GPS Error:", err);
                    toast.warning("Could not get GPS location. Uploading without it.");
                    uploadImage(); // Fallback without GPS
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            uploadImage();
        }
    };

    const handleInvoiceUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const headers: HeadersInit = {};
            const token = (session as any)?.accessToken;
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const apiRes = await fetch(`${API_BASE_URL}/api/v1/inventory/match-invoice?user_id=1&group_id=${groupId}`, {
                method: "POST",
                headers,
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

    const filteredItems = (Array.isArray(items) ? items : [])?.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupName = group?.name || `Folder #${groupId}`;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="bg-card border-b p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/inventory" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> My Inventories
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-foreground">{groupName}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Title & Badges */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight uppercase">{groupName}</h1>
                                {/* Currency Badge */}
                                <span className="text-xs font-bold bg-black text-white px-2 py-1 square-badge border border-black">
                                    {group?.currency || "USD"}
                                </span>
                            </div>
                            {group?.description && (
                                <p className="text-sm text-black font-mono max-w-2xl">
                                    {group.description}
                                </p>
                            )}
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

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Edit Button: Owner or Editor */}
                            {canWrite && (
                                <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)} className="text-black hover:bg-neutral-100 rounded-none border border-transparent hover:border-black">
                                    <PenTool className="w-5 h-5" />
                                </Button>
                            )}

                            {/* Share Button: Only Owner */}
                            {isOwner && (
                                <Button variant="ghost" size="icon" onClick={() => setIsShareOpen(true)} className="text-black hover:bg-neutral-100 rounded-none border border-transparent hover:border-black">
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

                    {/* Tab Navigation - Brutalist Style */}
                    <div className="flex border-b border-black mt-4">
                        <button
                            onClick={() => setActiveTab('items')}
                            className={`px-6 py-2 text-sm font-bold uppercase tracking-wider border-t border-x border-black transition-colors ${activeTab === 'items' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
                            style={{ marginBottom: '-1px' }} // Overlap border
                        >
                            Items
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-2 text-sm font-bold uppercase tracking-wider border-t border-r border-black transition-colors ${activeTab === 'analytics' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
                            style={{ marginBottom: '-1px' }}
                        >
                            Analytics
                        </button>
                    </div>

                    {/* Dialogs Components (Hidden) */}
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

                    {/* Edit Modal */}
                    <CreateUpdateFolderModal
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        mode="edit"
                        initialData={group}
                        onSuccess={() => mutate()}
                    />

                    {/* Filters - Only show in Items tab */}
                    {activeTab === 'items' && (
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
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-muted/20">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'analytics' ? (
                        <InventoryAnalyticsTab items={items || []} currency={group?.currency || "USD"} />
                    ) : (
                        // Active Tab: Items
                        isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <InventoryCardSkeleton key={i} />)}
                            </div>
                        ) : (!filteredItems || filteredItems.length === 0) ? (
                            <div className="text-center py-20">
                                <p className="text-muted-foreground">No items found.</p>
                            </div>
                        ) : (
                            // Re-using existing layout logic
                            <div className="space-y-0">
                                {/* Mobile View: Brutalist List */}
                                <div className="md:hidden border-t border-black">
                                    {filteredItems.map((item: any) => (
                                        <Link
                                            key={item.id}
                                            href={`/inventory/item/${item.id}`}
                                            className="w-full bg-white border-x border-b border-black p-3 flex flex-row gap-4 items-center rounded-none active:bg-neutral-100 transition-colors"
                                        >
                                            <div className="w-16 h-16 shrink-0 bg-neutral-100 border border-black rounded-none overflow-hidden relative">
                                                <SecureImage
                                                    itemId={item.id}
                                                    fallbackSrc={item.image_url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                    variant="thumbnail"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <h3 className="text-black font-medium text-base truncate uppercase tracking-tight">
                                                    {item.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-black uppercase tracking-wider font-mono">
                                                        ID: {item.id}
                                                    </span>
                                                    {item.price && (
                                                        <span className="text-xs text-black font-bold border border-black px-1">
                                                            {formatCurrency(item.price, group?.currency)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Desktop View: Grid */}
                                <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {filteredItems.map((item: any) => (
                                        <InventoryCard
                                            key={item.id}
                                            item={item}
                                            canEdit={canWrite}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

