"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Assuming these are compatible
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BrutalistSelect } from "@/components/ui/BrutalistSelect";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox component exists
import { API_BASE_URL } from "@/lib/config";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSWRConfig } from "swr"; // To mutate global cache if needed

interface CreateUpdateFolderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "edit";
    initialData?: {
        id?: number;
        name: string;
        description?: string;
        currency?: string;
        language?: string;
        settings?: {
            inventory_type?: string;
            enable_geolocation?: boolean;
            is_price_enabled?: boolean;
        };
    };
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function CreateUpdateFolderModal({
    open,
    onOpenChange,
    mode,
    initialData,
    onSuccess,
    trigger
}: CreateUpdateFolderModalProps) {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const { mutate } = useSWRConfig();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [language, setLanguage] = useState("ES");
    const [inventoryType, setInventoryType] = useState("GENERAL");
    const [enableGeolocation, setEnableGeolocation] = useState(false);
    const [isPriceEnabled, setIsPriceEnabled] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialData) {
                setName(initialData.name || "");
                setDescription(initialData.description || "");
                setCurrency(initialData.currency || "USD");
                setLanguage(initialData.language || "ES");
                setInventoryType(initialData.settings?.inventory_type || "GENERAL");
                setEnableGeolocation(initialData.settings?.enable_geolocation || false);
                // Default to true if undefined, but explicit false should be false
                setIsPriceEnabled(initialData.settings?.is_price_enabled !== false);
            } else {
                // Reset for create
                setName("");
                setDescription("");
                setCurrency("USD");
                setLanguage("ES");
                setInventoryType("GENERAL");
                setEnableGeolocation(false);
                setIsPriceEnabled(true);
            }
        }
    }, [open, mode, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const endpoint = mode === "create"
                ? `${API_BASE_URL}/api/v1/groups`
                : `${API_BASE_URL}/api/v1/groups/${initialData?.id}`;

            const method = mode === "create" ? "POST" : "PUT";

            const payload = {
                name,
                description,
                currency,
                language,
                settings: {
                    inventory_type: inventoryType,
                    enable_geolocation: enableGeolocation,
                    is_price_enabled: isPriceEnabled
                }
            };

            const res = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`Failed to ${mode} group`);

            toast.success(`Folder ${mode === 'create' ? 'Created' : 'Updated'}`);

            // Mutate Generic List
            mutate(`${API_BASE_URL}/api/v1/groups`);
            // Validate Detail View mutation if in edit mode
            if (mode === "edit" && initialData?.id) {
                mutate(`${API_BASE_URL}/api/v1/groups/${initialData.id}`);
            }

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            toast.error(`Error ${mode === 'create' ? 'creating' : 'updating'} folder`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="border-black rounded-none sm:max-w-[425px] max-h-[90vh] overflow-y-auto p-6 bg-white">
                <DialogHeader>
                    <DialogTitle className="uppercase font-bold tracking-wider text-xl">
                        {mode === "create" ? "Create New Folder" : "Edit Folder Settings"}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                        {mode === "create" ? "Configure your new inventory collection." : "Update your folder settings."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="uppercase font-mono text-xs">Folder Name</Label>
                        <Input
                            id="name"
                            placeholder="E.G. OFFICE SUPPLIES"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="rounded-none border-black focus-visible:ring-0 focus-visible:border-black font-medium"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="description" className="uppercase font-mono text-xs">Description</Label>
                            <span className="font-mono text-[10px] text-neutral-500">[{description.length} / 250]</span>
                        </div>
                        <Textarea
                            id="description"
                            placeholder="E.G. PERSONAL ELECTRONICS AND GADGETS"
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 250))}
                            className="w-full border-black p-2 font-mono text-sm bg-white rounded-none resize-none h-24 focus-visible:ring-0 focus-visible:border-black"
                        />
                    </div>

                    {/* Inventory Type & Settings */}
                    <div className="space-y-4 border-t border-black pt-4">
                        <Label className="uppercase font-mono text-xs block">Specialized Configurations</Label>

                        <BrutalistSelect
                            label="Inventory Type"
                            value={inventoryType}
                            onChange={(e) => setInventoryType(e.target.value)}
                            options={[
                                { label: "General (Standard)", value: "GENERAL" },
                                { label: "Nature & Botany", value: "NATURE" },
                                { label: "Places & Commerce", value: "PLACES" },
                            ]}
                        />

                        <div className="flex items-center space-x-3 p-3 border border-black bg-white hover:bg-neutral-50 transition-colors">
                            <Checkbox
                                id="gps_toggle"
                                checked={enableGeolocation}
                                onCheckedChange={(c: boolean) => setEnableGeolocation(c === true)}
                                className="h-6 w-6 border-2 border-black rounded-none data-[state=checked]:bg-black data-[state=checked]:text-white"
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="gps_toggle" className="font-bold uppercase tracking-wider text-sm cursor-pointer text-black">Capture Geolocation</Label>
                                <span className="text-[10px] font-mono text-neutral-500">Record GPS coordinates for each item.</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 border border-black bg-white hover:bg-neutral-50 transition-colors">
                            <Checkbox
                                id="price_toggle"
                                checked={isPriceEnabled}
                                onCheckedChange={(c: boolean) => setIsPriceEnabled(c === true)}
                                className="h-6 w-6 border-2 border-black rounded-none data-[state=checked]:bg-black data-[state=checked]:text-white"
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="price_toggle" className="font-bold uppercase tracking-wider text-sm cursor-pointer text-black">Enable Price Tracking</Label>
                                <span className="text-[10px] font-mono text-neutral-500">If disabled, price field will be hidden and optional.</span>
                            </div>
                        </div>
                    </div>

                    {/* Currency */}
                    <div>
                        <BrutalistSelect
                            label="Currency Configuration"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            options={[
                                { label: "🇺🇸 USD - US Dollar ($)", value: "USD" },
                                { label: "🇨🇴 COP - Colombian Peso ($)", value: "COP" },
                                { label: "🇪🇺 EUR - Euro (€)", value: "EUR" },
                            ]}
                        />

                        <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase">
                            Note: Changing currency affects how prices are displayed and summed.
                        </p>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                        <BrutalistSelect
                            label="AI OUTPUT LANGUAGE"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            options={[
                                { label: "ESPAÑOL (ES)", value: "ES" },
                                { label: "ENGLISH (EN)", value: "EN" },
                            ]}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-black text-white rounded-none uppercase tracking-widest hover:bg-neutral-800 font-bold py-6 text-sm"
                        >
                            {isSubmitting ? "SAVING..." : (mode === "create" ? "CREATE FOLDER" : "SAVE CHANGES")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
