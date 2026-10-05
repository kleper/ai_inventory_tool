"use client";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Settings, Key, Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UserNav() {
    const { data: session } = useSession();

    // Fallback initials
    const initials = session?.user?.name
        ? session.user.name.slice(0, 2).toUpperCase()
        : "US";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div role="button" className="flex items-center gap-3 w-full cursor-pointer hover:bg-neutral-100 p-1 transition-colors">
                    <Avatar className="h-8 w-8 border border-black rounded-none">
                        <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                        <AvatarFallback className="bg-white text-black rounded-none font-medium mobile:text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0 text-left overflow-hidden">
                        <p className="text-sm font-bold uppercase tracking-tight text-black truncate max-w-[140px]">
                            {session?.user?.name || "User"}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 truncate max-w-[140px]">
                            {session?.user?.email || ""}
                        </p>
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {session?.user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <Link href="/profile">
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/profile/developer">
                        <DropdownMenuItem className="cursor-pointer">
                            <Key className="mr-2 h-4 w-4" />
                            <span>API Keys & MCP</span>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/docs/api">
                        <DropdownMenuItem className="cursor-pointer">
                            <Terminal className="mr-2 h-4 w-4" />
                            <span>API & MCP Docs</span>
                        </DropdownMenuItem>
                    </Link>
                    <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                    </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
