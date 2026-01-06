"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Scan, FileText, User } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        // Special case for dashboard to match root or /dashboard
        if (path === "/dashboard" && (pathname === "/" || pathname === "/dashboard")) return true;
        return pathname.startsWith(path);
    };

    return (
        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-black z-50 h-16 grid grid-cols-5">
            {/* Dashboard */}
            <Link
                href="/dashboard"
                className={`flex flex-col items-center justify-center h-full border-r border-black relative ${isActive("/dashboard") ? "bg-black text-white" : "text-black bg-white"}`}
            >
                {isActive("/dashboard") && <div className="absolute top-0 w-full h-1 bg-white" />}
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold mt-1">Home</span>
            </Link>

            {/* Inventories */}
            <Link
                href="/inventory"
                className={`flex flex-col items-center justify-center h-full border-r border-black relative ${isActive("/inventory") ? "bg-black text-white" : "text-black bg-white"}`}
            >
                {isActive("/inventory") && <div className="absolute top-0 w-full h-1 bg-white" />}
                <FolderOpen className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold mt-1">Files</span>
            </Link>

            {/* SCAN - Highlighted */}
            <Link
                href="/scan"
                className="flex flex-col items-center justify-center h-full bg-black text-white border-r border-black relative"
            >
                <div className="p-1 border border-white">
                    <Scan className="w-6 h-6" />
                </div>
            </Link>

            {/* Invoices */}
            <Link
                href="/invoices"
                className={`flex flex-col items-center justify-center h-full border-r border-black relative ${isActive("/invoices") ? "bg-black text-white" : "text-black bg-white"}`}
            >
                {isActive("/invoices") && <div className="absolute top-0 w-full h-1 bg-white" />}
                <FileText className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold mt-1">Docs</span>
            </Link>

            {/* Profile */}
            <Link
                href="/profile"
                className={`flex flex-col items-center justify-center h-full relative ${isActive("/profile") ? "bg-black text-white" : "text-black bg-white"}`}
            >
                {isActive("/profile") && <div className="absolute top-0 w-full h-1 bg-white" />}
                <User className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold mt-1">User</span>
            </Link>
        </div>
    );
}
