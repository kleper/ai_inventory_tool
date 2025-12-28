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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black pb-safe pb-4 pt-2 px-4 z-50">
            <div className="flex justify-around items-center">
                {MOBILE_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 rounded-none transition-colors ${isActive
                                ? "text-black font-bold"
                                : "text-neutral-500 hover:text-black"
                                }`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
