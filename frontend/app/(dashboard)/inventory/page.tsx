"use client";

import { InventoryFolderCard } from "@/components/features/InventoryFolderCard";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import useSWR from "swr";
import { useState } from "react";
import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";
import { CreateUpdateFolderModal } from "@/components/features/CreateUpdateFolderModal";

export default function InventoryFoldersPage() {
  const { data: session } = useSession();
  const fetcher = useAuthFetcher();
  const token = (session as any)?.accessToken;

  const { data: groups, error, isLoading, mutate } = useSWR(token ? `${API_BASE_URL}/api/v1/groups` : null, fetcher);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (error) return <div className="p-8 text-center text-red-500">Failed to load inventories</div>;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-black pb-6">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-black">My Inventories</h1>
          <p className="mt-2 text-black font-mono text-sm">Manage your item collections and folders.</p>
        </div>

        <CreateUpdateFolderModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          onSuccess={() => mutate()}
          trigger={
            <Button className="w-full md:w-auto px-6 py-3 bg-black text-white border border-black rounded-none uppercase font-medium tracking-widest hover:bg-white hover:text-black transition-colors gap-2 shadow-none h-auto">
              <Plus className="w-4 h-4" /> Create Folder
            </Button>
          }
        />
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
