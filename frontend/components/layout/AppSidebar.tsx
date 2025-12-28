"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Scan, FileText, Settings, User } from "lucide-react";
import { UserNav } from "./UserNav";

const NAV_ITEMS = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Inventories", href: "/inventory", icon: FolderOpen },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Admin", href: "/admin", icon: Settings }, // Should check role
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-black h-screen sticky top-0 bg-white">
            <div className="p-6 border-b border-black">
                <div className="flex items-center gap-2 font-medium text-lg text-black uppercase tracking-tight">
                    <div className="w-8 h-8 bg-black rounded-none border border-black flex items-center justify-center text-white font-bold">AI</div>
                    SmartInventory
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-none text-sm font-medium uppercase tracking-wide transition-all border border-transparent ${isActive
                                ? "bg-black text-white border-black"
                                : "text-black hover:bg-neutral-100 hover:border-black/10"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-black bg-white">
                <div className="border border-black p-2 bg-white text-black">
                    <UserNav />
                </div>
            </div>
        </aside>
    );
}
