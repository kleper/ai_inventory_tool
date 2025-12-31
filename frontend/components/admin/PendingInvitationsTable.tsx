"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";

interface Invitation {
    id: number;
    email: string;
    status: string;
    expires_at: string;
}

export function PendingInvitationsTable() {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const fetcher = useAuthFetcher();

    const { data: invitations, error, mutate } = useSWR<Invitation[]>(
        token ? `${API_BASE_URL}/api/v1/admin/invitations` : null,
        fetcher
    );

    const [processingId, setProcessingId] = useState<number | null>(null);

    const handleResend = async (id: number) => {
        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/invitations/${id}/resend`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to resend");

            toast.success("INVITATION RESENT SUCCESSFULLY", {
                className: "bg-white text-black border border-black rounded-none font-bold shadow-none"
            });
        } catch (err) {
            toast.error("Error resending invitation");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRevoke = async (id: number) => {
        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/invitations/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to revoke");

            toast.success("INVITATION REVOKED");
            mutate(); // Refresh list
        } catch (err) {
            toast.error("Error revoking invitation");
        } finally {
            setProcessingId(null);
        }
    };

    if (!invitations && !error) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-white" /></div>;

    return (

        <div className="bg-white border border-black overflow-hidden rounded-none shadow-none">
            <div className="px-6 py-4 border-b border-black bg-white">
                <h3 className="font-bold text-lg uppercase tracking-widest text-black">Pending Invitations</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-black">
                    <thead className="text-xs uppercase bg-white text-black border-b border-black">
                        <tr>
                            <th className="px-6 py-4 border-r border-black font-bold tracking-wider">Email</th>
                            <th className="px-6 py-4 border-r border-black font-bold tracking-wider">Status</th>
                            <th className="px-6 py-4 border-r border-black font-bold tracking-wider">Expires</th>
                            <th className="px-6 py-4 font-bold tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {invitations?.map((invite) => (
                            <tr key={invite.id} className="hover:bg-neutral-50 text-black font-mono group">
                                <td className="px-6 py-4 font-bold border-r border-black">{invite.email}</td>
                                <td className="px-6 py-4 border-r border-black">
                                    <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-black bg-white text-black rounded-none">
                                        {invite.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 border-r border-black text-xs">
                                    {new Date(invite.expires_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button
                                        onClick={() => handleResend(invite.id)}
                                        disabled={processingId === invite.id}
                                        className="bg-black text-white border border-black px-3 py-1 flex items-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-none"
                                    >
                                        {processingId === invite.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Resend</span>
                                    </button>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button
                                                disabled={processingId === invite.id}
                                                className="text-red-600 border border-red-600 px-3 py-1 flex items-center gap-2 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 rounded-none"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Revoke</span>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-white border border-black text-black rounded-none shadow-none sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="uppercase font-bold text-black tracking-wide">Revoke Invitation?</DialogTitle>
                                                <DialogDescription className="text-neutral-500 font-mono text-xs mt-2">
                                                    This will invalidate the link sent to {invite.email}. They will not be able to register.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="gap-3 sm:gap-0 mt-6">
                                                <DialogClose asChild>
                                                    <button className="bg-white text-black border border-black px-4 py-2 hover:bg-neutral-100 font-bold uppercase text-xs rounded-none tracking-wider transition-colors">Cancel</button>
                                                </DialogClose>
                                                <button
                                                    onClick={() => handleRevoke(invite.id)}
                                                    className="bg-red-600 text-white border border-red-600 px-4 py-2 hover:bg-red-700 font-bold uppercase text-xs rounded-none tracking-wider transition-colors ml-2"
                                                >
                                                    Yes, Revoke
                                                </button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </td>
                            </tr>
                        ))}
                        {invitations?.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 font-mono text-sm uppercase tracking-widest border-dashed">
                                    No pending invitations.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

