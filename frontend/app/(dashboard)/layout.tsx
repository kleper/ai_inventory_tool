import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ReconciliationModal } from "@/components/features/ReconciliationModal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Desktop Sidebar */}
            <AppSidebar />

            <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 relative overflow-hidden">
                {/* Header could go here if needed universally */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                    <ReconciliationModal />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
}
