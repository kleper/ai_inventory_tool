"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, FileText, Settings, User } from "lucide-react";
import { UserNav } from "./UserNav";
import { Branding } from "@/components/ui/branding"; // Assuming we might want to extract this later, but inline for now is fine as per prompt

const NAV_ITEMS = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventories", href: "/inventory", icon: FolderOpen },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Admin", href: "/admin", icon: Settings }, // Should check role
];

export function AppSidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === "/dashboard" && pathname === "/") return true;
        return pathname.startsWith(path);
    };

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-black h-screen sticky top-0 bg-white">
            <div className="p-6 border-b border-black">
                <div className="flex items-center gap-2 font-medium text-lg text-black uppercase tracking-tight">
                    <div className="w-8 h-8 bg-black rounded-none border border-black flex items-center justify-center text-white font-bold">AI</div>
                    SmartInventory
                </div>
            </div>

            <nav className="flex-1 p-0 space-y-0 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-6 py-4 rounded-none text-sm font-medium uppercase tracking-wide transition-all border-b border-black ${active
                                ? "bg-black text-white hover:bg-black"
                                : "bg-white text-black hover:bg-zinc-50"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-0 border-t border-black bg-white">
                {/* User Nav could be brutalist too */}
                <div className="p-4 bg-white text-black">
                    <UserNav />
                </div>
            </div>
        </aside>
    );
}
