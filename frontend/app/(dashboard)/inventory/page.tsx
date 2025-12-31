"use client";

import { InventoryFolderCard } from "@/components/features/InventoryFolderCard";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import useSWR from "swr";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";

// fetcher removed

export default function InventoryFoldersPage() {
  const { data: session } = useSession();
  const fetcher = useAuthFetcher();
  const token = (session as any)?.accessToken;

  const { data: groups, error, isLoading, mutate } = useSWR(token ? `${API_BASE_URL}/api/v1/groups` : null, fetcher);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/v1/groups`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newGroupName, description: newGroupDescription })
      });
      if (!res.ok) throw new Error("Failed to create group");
      toast.success("Folder created");
      setNewGroupName("");
      setNewGroupDescription("");
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
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-black pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-black">My Inventories</h1>
          <p className="mt-2 text-black font-mono text-sm">Manage your item collections and folders.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto px-6 py-3 bg-black text-white border border-black rounded-none uppercase font-medium tracking-widest hover:bg-white hover:text-black transition-colors gap-2 shadow-none h-auto">
              <Plus className="w-4 h-4" /> Create Folder
            </Button>
          </DialogTrigger>
          <DialogContent className="border-black rounded-none">
            {/* Brutalist Dialog Content optionally, but sticking to Header request first. 
                 The prompt asked for the Header component fixes. 
                 The Button style is inline here as requested. 
             */}
            <DialogHeader>
              <DialogTitle className="uppercase font-bold tracking-wider">Create New Inventory Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="uppercase font-mono text-xs">Folder Name</Label>
                <Input
                  id="name"
                  placeholder="E.G. OFFICE SUPPLIES"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="rounded-none border-black focus-visible:ring-0 focus-visible:border-black"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="uppercase font-mono text-xs">Description</Label>
                  <span className="font-mono text-[10px] text-neutral-500">[{newGroupDescription.length} / 250 CHARS]</span>
                </div>
                <Textarea
                  id="description"
                  placeholder="E.G. PERSONAL ELECTRONICS AND GADGETS"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value.slice(0, 250))}
                  className="w-full border-black p-2 font-mono text-sm bg-white rounded-none resize-none h-24 focus-visible:ring-0 focus-visible:border-black"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating} className="w-full bg-black text-white rounded-none uppercase tracking-widest hover:bg-neutral-800">
                  {isCreating ? "CREATING..." : "CREATE FOLDER"}
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
          {Array.isArray(groups) && groups.map((group: any) => (
            <InventoryFolderCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
