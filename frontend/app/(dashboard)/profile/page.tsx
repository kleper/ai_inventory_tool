"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { LogOut, Sun, Moon, Laptop } from "lucide-react";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { theme, setTheme } = useTheme();

    if (status === "loading") {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[150px] w-full" />
            </div>
        );
    }

    const user = session?.user;
    const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "US";

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>
                            Basic info from your account provider. Managed via {session?.user?.email?.includes("gmail") ? "Google" : "Credentials"}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={user?.image || ""} />
                                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                                {user?.image ? (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium w-fit border border-green-200 dark:border-green-800">
                                        Connected with Google
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium w-fit">
                                        Standard Account
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={user?.name || ""} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input value={user?.email || ""} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>User ID</Label>
                                <Input value={(user as any)?.id || "Unknown"} disabled className="font-mono text-xs text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input value={(user as any)?.role || "User"} disabled className="uppercase" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle>Application Preferences</CardTitle>
                        <CardDescription>Customize your interface experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base">Theme</Label>
                                <p className="text-sm text-muted-foreground">Select your preferred appearance mode.</p>
                            </div>
                            <div className="flex items-center gap-2 border p-1 rounded-lg">
                                <Button
                                    variant={theme === 'light' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setTheme('light')}
                                    className="w-9 h-9 p-0"
                                >
                                    <Sun className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setTheme('dark')}
                                    className="w-9 h-9 p-0"
                                >
                                    <Moon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setTheme('system')}
                                    className="w-9 h-9 p-0"
                                >
                                    <Laptop className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-100 dark:border-red-900/30">
                    <CardHeader>
                        <CardTitle className="text-red-600 dark:text-red-500">Session Management</CardTitle>
                        <CardDescription>Sign out of your account on this device.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
