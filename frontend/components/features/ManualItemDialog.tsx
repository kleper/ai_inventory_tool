"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Plus, Loader2, MapPin, Satellite } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { NativeCameraInput } from "./NativeCameraInput";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useGeolocation } from "@/hooks/useGeolocation";

// Validation Schema
const itemSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    category: z.string().optional(),
    price: z.coerce.number().optional(),
    quantity: z.coerce.number().min(1).default(1),
    description: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ManualItemDialogProps {
    groupId: string;
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
}

export function ManualItemDialog({ groupId, onSuccess, open: controlledOpen, onOpenChange, showTrigger = true }: ManualItemDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = (val: boolean) => {
        setInternalOpen(val);
        onOpenChange?.(val);
    };

    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { data: session } = useSession();

    // Group Settings Fetch
    const { data: groupData } = useSWR(`${API_BASE_URL}/api/v1/groups/${groupId}`, async (url) => {
        const token = (session as any)?.accessToken;
        const headers: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        return await res.json();
    });

    const enableGps = groupData?.settings?.enable_geolocation || false;

    // GPS Hook
    // We only enable the hook if the dialog is OPEN and the group has GPS enabled
    const { location, loading: gpsLoading, error: gpsError, getLocation: retryGps } = useGeolocation(isOpen && enableGps);

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            quantity: 1,
            category: "General"
        }
    });

    const categories = ["General", "Electronics", "Home", "Office", "Tools", "Clothing", "Other"];

    const onSubmit = async (data: ItemFormValues) => {
        setIsLoading(true);
        try {
            const payload = {
                ...data,
                group_id: parseInt(groupId),
                meta_data: location ? { coordinates: location } : {}
            };

            console.log("PAYLOAD TO SEND:", JSON.stringify(payload, null, 2));

            const token = (session as any)?.accessToken;
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to create item");

            toast.success("Item created successfully");
            setOpen(false);
            reset();
            setImageFile(null);
            setPreviewUrl(null);
            onSuccess?.();

        } catch (error) {
            toast.error("Error creating item");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {showTrigger && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-none border-black hover:bg-neutral-100 uppercase font-bold text-xs tracking-wider">
                        <Plus className="w-4 h-4" /> Add Item
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh] border-black rounded-none shadow-none bg-white p-6">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <DialogTitle className="uppercase font-bold tracking-wider text-xl">
                                Add Item Manually
                            </DialogTitle>
                            <DialogDescription className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                                Enter details manually.
                            </DialogDescription>
                        </div>

                        {/* GPS Status Badge */}
                        {enableGps && (
                            <div className="flex flex-col items-end gap-1">
                                {gpsLoading && (
                                    <div className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-800 px-2 py-1 uppercase tracking-widest font-mono animate-pulse">
                                        <Satellite className="w-3 h-3 animate-spin" /> SEARCHING SATELLITES...
                                    </div>
                                )}
                                {location && (
                                    <div className="flex items-center gap-1 text-[10px] bg-green-100 text-green-800 border border-green-800 px-2 py-1 uppercase tracking-widest font-mono">
                                        <MapPin className="w-3 h-3" /> GPS LOCKED: [{location.lat.toFixed(4)}, {location.lng.toFixed(4)}]
                                    </div>
                                )}
                                {gpsError && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 border border-red-800 px-2 py-1 uppercase tracking-widest font-mono">
                                            <AlertCircle className="w-3 h-3" /> GPS FAILED
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={retryGps}
                                            className="h-6 text-[10px] px-2 rounded-none border-black hover:bg-black hover:text-white uppercase"
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="uppercase font-mono text-xs">Name</Label>
                        <Input id="name" {...register("name")} placeholder="ITEM NAME" className="rounded-none border-black focus-visible:ring-0 uppercase placeholder:normal-case" />
                        {errors.name && <p className="text-xs text-red-600 font-mono mt-1 uppercase">{errors.name.message}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category" className="uppercase font-mono text-xs">Category</Label>
                        <select
                            id="category"
                            {...register("category")}
                            className="flex h-10 w-full rounded-none border border-black bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-0 disabled:opacity-50 font-sans uppercase"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <div className="space-y-2">
                            <Label htmlFor="price" className="uppercase font-mono text-xs">Price ($)</Label>
                            <Input id="price" type="number" step="0.01" {...register("price")} placeholder="0.00" className="rounded-none border-black focus-visible:ring-0" />
                        </div>
                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="uppercase font-mono text-xs">Quantity</Label>
                            <Input id="quantity" type="number" min="1" {...register("quantity")} className="rounded-none border-black focus-visible:ring-0" />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="uppercase font-mono text-xs">Description</Label>
                        <Input id="description" {...register("description")} placeholder="OPTIONAL NOTES" className="rounded-none border-black focus-visible:ring-0 uppercase placeholder:normal-case" />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-black mt-6">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-none uppercase font-bold text-xs hover:bg-neutral-100">Cancel</Button>
                        <Button
                            type="submit"
                            disabled={isLoading || (enableGps && gpsLoading)}
                            title={enableGps && gpsLoading ? "Please wait for GPS..." : "Save Item"}
                            className="bg-black text-white rounded-none uppercase tracking-widest font-bold text-xs hover:bg-neutral-800 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(isLoading || (enableGps && gpsLoading)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {enableGps && gpsLoading ? "WAITING FOR GPS..." : "SAVE ITEM"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

import { AlertCircle } from "lucide-react";
