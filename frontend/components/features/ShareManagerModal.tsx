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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash, UserPlus, Shield, Eye, Loader2 } from "lucide-react";
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
            <DialogContent className="sm:max-w-md border border-black shadow-none rounded-none bg-white">
                <DialogHeader className="border-b border-black pb-4">
                    <DialogTitle className="uppercase tracking-tight font-bold text-xl">Share "{groupName}"</DialogTitle>
                    <DialogDescription className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                        Invite others to collaborate.
                    </DialogDescription>
                </DialogHeader>

                {isOwner && (
                    <form onSubmit={handleInvite} className="space-y-4 py-4 border-b border-black">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                type="email"
                                className="border-black rounded-none shadow-none focus:ring-0"
                            />
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-[110px] border border-black rounded-none bg-white px-3 py-2 text-sm focus:outline-none uppercase font-bold"
                            >
                                <option value="VIEWER">Viewer</option>
                                <option value="EDITOR">Editor</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full bg-black text-white hover:bg-neutral-800 rounded-none uppercase font-bold tracking-wide border border-black" disabled={isInviting}>
                            {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="mr-2 w-4 h-4" />}
                            {isInviting ? "INVITING..." : "INVITE"}
                        </Button>
                    </form>
                )}

                <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-black mb-2">People with access</h4>
                    <div className="space-y-0 divide-y divide-black/10 border border-black/10">
                        {isLoading ? (
                            <div className="p-4 text-center">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto opacity-50" />
                            </div>
                        ) : members.length === 0 ? (
                            <p className="p-4 text-xs font-mono text-center text-neutral-500 uppercase">No shared members yet.</p>
                        ) : (
                            members.map(member => (
                                <div key={member.user_id} className="flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 rounded-none border border-black">
                                            <AvatarFallback className="rounded-none bg-black text-white font-bold">{member.email[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-sm text-black">{member.email}</div>
                                            <div className="text-[10px] font-mono uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                                                {member.role === "EDITOR" ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                {member.role}
                                            </div>
                                        </div>
                                    </div>

                                    {isOwner && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-black hover:bg-red-50 hover:text-red-600 rounded-none h-8 w-8"
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
