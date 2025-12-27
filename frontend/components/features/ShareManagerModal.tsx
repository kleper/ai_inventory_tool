import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash, UserPlus, Shield, Eye } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useSession } from "next-auth/react";

interface Member {
    user_id: number;
    email: string;
    role: string;
    image?: string;
}

interface ShareManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    groupName: string;
    isOwner: boolean;
}

export function ShareManagerModal({ open, onOpenChange, groupId, groupName, isOwner }: ShareManagerModalProps) {
    const { data: session } = useSession();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("VIEWER");
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInviting, setIsInviting] = useState(false);

    const token = (session as any)?.accessToken;

    useEffect(() => {
        if (open && groupId && token) {
            fetchMembers();
        }
    }, [open, groupId, token]);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/share`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/share`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email, role })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to invite");
            }

            toast.success("User invited successfully");
            setEmail("");
            fetchMembers();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemove = async (userId: number) => {
        if (!confirm("Are you sure you want to remove this user?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/share/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast.success("User removed");
                setMembers(prev => prev.filter(m => m.user_id !== userId));
            } else {
                toast.error("Failed to remove user");
            }
        } catch (error) {
            toast.error("Error removing user");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share "{groupName}"</DialogTitle>
                    <DialogDescription>
                        Invite others to collaborate on this inventory.
                    </DialogDescription>
                </DialogHeader>

                {isOwner && (
                    <form onSubmit={handleInvite} className="space-y-4 py-4 border-b">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                type="email"
                            />
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="w-[110px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                    <SelectItem value="EDITOR">Editor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={isInviting}>
                            {isInviting ? "Inviting..." : "Invite"} <UserPlus className="ml-2 w-4 h-4" />
                        </Button>
                    </form>
                )}

                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-medium text-muted-foreground">People with access</h4>
                    <div className="space-y-3">
                        {isLoading ? (
                            <p className="text-sm text-center">Loading...</p>
                        ) : members.length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground">No shared members yet.</p>
                        ) : (
                            members.map(member => (
                                <div key={member.user_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            {/* <AvatarImage src={member.image} /> */}
                                            <AvatarFallback>{member.email[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{member.email}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                {member.role === "EDITOR" ? <Shield className="w-3 h-3 text-blue-500" /> : <Eye className="w-3 h-3 text-gray-400" />}
                                                {member.role}
                                            </div>
                                        </div>
                                    </div>

                                    {isOwner && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => handleRemove(member.user_id)}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
