"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Scan, FolderOpen, User } from "lucide-react";

const MOBILE_NAV_ITEMS = [
    { label: "Home", href: "/inventory", icon: LayoutDashboard },
    { label: "Scan", href: "/scan", icon: Scan },
    { label: "Folders", href: "/inventory", icon: FolderOpen },
    { label: "Profile", href: "/profile", icon: User },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t-[3px] border-white pb-safe pb-4 pt-2 px-4 z-50 shadow-[0_-4px_0_0_rgba(255,255,255,0.1)]">
            <div className="flex justify-around items-center">
                {MOBILE_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400"
                                }`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
