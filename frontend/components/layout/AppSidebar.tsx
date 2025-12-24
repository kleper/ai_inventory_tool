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
        <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-neutral-800 h-screen sticky top-0 bg-white dark:bg-black">
            <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">AI</div>
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
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-neutral-800">
                <UserNav />
            </div>
        </aside>
    );
}
