"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import { Link } from "lucide-react"; // Wait, Link is next/link, Icon is Link
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, Edit2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import  from "@/components/ui/alert"; // Removed unused Alert import

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ItemDetailPage() {
    const params = useParams();
    const itemId = params.itemId as string;
    const router = useRouter();

    const { data: item, error, isLoading, mutate } = useSWR(
        itemId ? `${API_BASE_URL}/api/v1/inventory/items/${itemId}` : null,
        fetcher
    );

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        description: "",
        status: ""
    });

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || "",
                category: item.category || "",
                price: item.price?.toString() || "",
                description: item.description || "",
                status: item.status
            });
            // Auto-edit if pending/review
            if (item.status === 'pending_price' || item.status === 'needs_review') {
                setIsEditing(true);
            }
        }
    }, [item]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "PUT", // or PATCH
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: formData.price ? parseFloat(formData.price) : null,
                    status: 'completed' // Mark as completed on save
                })
            });

            if (!res.ok) throw new Error("Update failed");

            toast.success("Item updated successfully");
            mutate();
            setIsEditing(false);
        } catch (err) {
            toast.error("Failed to update item");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/items/${itemId}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Delete failed");

            toast.success("Item deleted");
            // Redirect to folder if possible, else inventory root
            // We need group_id to go back to folder. item.group_id
            if (item?.group_id) {
                router.push(`/inventory/${item.group_id}`);
            } else {
                router.push("/inventory");
            }
        } catch (err) {
            toast.error("Failed to delete item");
        }
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (error || !item) return <div className="p-10 text-center">Item not found</div>;

    // Image handling
    let imageUrl = item.imageUrl;
    if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = imageUrl.startsWith("/") ? `${API_BASE_URL}${imageUrl}` : `${API_BASE_URL}/${imageUrl}`;
    }

    return (
        <div className="container max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 pl-0 hover:pl-0 hover:bg-transparent hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>
                {item.status !== 'completed' && !isEditing && (
                    <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        Needs Review
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Image */}
                <div className="space-y-4">
                    <div className="aspect-square bg-gray-100 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-border/50 relative group">
                        {imageUrl ? (
                            <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <ImageIcon className="w-12 h-12 opacity-20" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details / Form */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Edit Item" : item.name}</h1>
                        {!isEditing && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleDelete}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Item Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="category">Category</Label>
                                            <Input
                                                id="category"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Price ($)</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-3 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit" className="gap-2">
                                    <Save className="w-4 h-4" /> Save Changes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block mb-1">Category</span>
                                    <span className="font-medium bg-secondary px-2 py-1 rounded-md">{item.category || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block mb-1">Price</span>
                                    <span className="font-medium text-lg text-green-600 dark:text-green-400">
                                        {item.price ? `$${item.price.toFixed(2)}` : "--"}
                                    </span>
                                </div>
                            </div>

                            <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-300">
                                <h3 className="text-foreground font-semibold mb-2">Description</h3>
                                <p>{item.description || "No description provided."}</p>
                            </div>

                            <div className="pt-6 border-t border-border">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                                    <span>Status: {item.status}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
