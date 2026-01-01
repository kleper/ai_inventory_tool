"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"; // Assuming these are compatible
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BrutalistSelect } from "@/components/ui/BrutalistSelect";
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialData) {
                setName(initialData.name || "");
                setDescription(initialData.description || "");
                setCurrency(initialData.currency || "USD");
            } else {
                // Reset for create
                setName("");
                setDescription("");
                setCurrency("USD");
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

            const res = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify({ name, description, currency })
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
            <DialogContent className="border-black rounded-none sm:max-w-[425px] p-6 bg-white">
                <DialogHeader>
                    <DialogTitle className="uppercase font-bold tracking-wider text-xl">
                        {mode === "create" ? "Create New Folder" : "Edit Folder Settings"}
                    </DialogTitle>
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
