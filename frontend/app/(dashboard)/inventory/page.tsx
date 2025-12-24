"use client";

import { InventoryFolderCard } from "@/components/features/InventoryFolderCard";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import useSWR from "swr";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventoryFoldersPage() {
  const { data: groups, error, isLoading, mutate } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/groups`, fetcher);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName })
      });
      if (!res.ok) throw new Error("Failed to create group");
      toast.success("Folder created");
      setNewGroupName("");
      setIsCreateOpen(false);
      mutate();
    } catch (error) {
      toast.error("Error creating folder");
    } finally {
      setIsCreating(false);
    }
  };

  if (error) return <div className="p-8 text-center text-red-500">Failed to load inventories</div>;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center border-b pb-6 border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Inventories</h1>
          <p className="text-muted-foreground mt-1">Manage your item collections and folders.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm font-medium">
              <Plus className="w-4 h-4" /> Create Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Inventory Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Folder Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Office Supplies, Warehouse A"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Folder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-neutral-800 animate-pulse rounded-xl border border-transparent" />
          ))}
        </div>
      ) : (!groups || groups.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50/50 dark:bg-neutral-900/20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-gray-400">
            <FolderPlus className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No inventories yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Create your first folder to start organizing items and invoices.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
            Create First Folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <InventoryFolderCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
