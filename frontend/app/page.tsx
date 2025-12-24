import { InventoryDashboard } from "@/components/features/InventoryDashboard";

export default function Home() {
  // Mock data
  const items = [
    { id: 1, name: "MacBook Pro 16", status: "completed" as const, imageUrl: "", price: 2499 },
    { id: 2, name: "Logitech MX Master 3", status: "pending_price" as const, imageUrl: "" },
    { id: 3, name: "Dell UltraSharp Monitor", status: "completed" as const, imageUrl: "", price: 450 },
    { id: 4, name: "Herman Miller Chair", status: "pending_price" as const, imageUrl: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium">
          Export CSV
        </button>
      </div>

      <InventoryDashboard />
    </div>
  );
}
