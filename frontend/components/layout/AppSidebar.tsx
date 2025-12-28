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
        <aside className="hidden md:flex flex-col w-64 border-r-[3px] border-white h-screen sticky top-0 bg-black">
            <div className="p-6 border-b-[3px] border-white">
                <div className="flex items-center gap-2 font-bold text-lg text-white uppercase tracking-tighter">
                    <div className="w-8 h-8 bg-primary rounded-none border-2 border-white flex items-center justify-center text-black shadow-brutal-sm font-black">AI</div>
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
                            className={`flex items-center gap-3 px-3 py-2 rounded-none text-sm font-bold uppercase tracking-wide transition-all border-2 border-transparent ${isActive
                                ? "bg-primary text-black border-white shadow-brutal-sm translate-x-[2px] translate-y-[2px]"
                                : "text-white hover:bg-white hover:text-black hover:border-white hover:shadow-brutal-sm hover:-translate-y-0.5"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t-[3px] border-white">
                <UserNav />
            </div>
        </aside>
    );
}
