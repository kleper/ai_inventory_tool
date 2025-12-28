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
                className: "bg-black text-white border-2 border-white rounded-none font-bold"
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
        <div className="bg-black border-[3px] border-white shadow-brutal overflow-hidden">
            <div className="px-6 py-4 border-b-[3px] border-white bg-neutral-900">
                <h3 className="font-bold text-lg uppercase text-white">Pending Invitations</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-black text-primary border-b-2 border-white">
                        <tr>
                            <th className="px-6 py-3 border-r-2 border-white font-black">Email</th>
                            <th className="px-6 py-3 border-r-2 border-white font-black">Status</th>
                            <th className="px-6 py-3 border-r-2 border-white font-black">Expires</th>
                            <th className="px-6 py-3 font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-white">
                        {invitations?.map((invite) => (
                            <tr key={invite.id} className="hover:bg-neutral-900 text-white font-mono">
                                <td className="px-6 py-4 font-bold border-r-2 border-white">{invite.email}</td>
                                <td className="px-6 py-4 border-r-2 border-white">
                                    <span className="px-2 py-1 text-xs font-bold uppercase border border-white bg-primary text-black">
                                        {invite.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 border-r-2 border-white text-xs">
                                    {new Date(invite.expires_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button
                                        onClick={() => handleResend(invite.id)}
                                        disabled={processingId === invite.id}
                                        className="bg-primary text-black border border-white px-2 py-1 flex items-center gap-1 hover:bg-white transition-colors disabled:opacity-50"
                                    >
                                        {processingId === invite.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        <span className="text-[10px] font-bold uppercase">Resend</span>
                                    </button>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button
                                                disabled={processingId === invite.id}
                                                className="text-red-500 border border-red-500 px-2 py-1 flex items-center gap-1 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase">Revoke</span>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-black border-[3px] border-white text-white">
                                            <DialogHeader>
                                                <DialogTitle className="uppercase font-black">Revoke Invitation?</DialogTitle>
                                                <DialogDescription className="text-neutral-400">
                                                    This will invalidate the link sent to {invite.email}. They will not be able to register.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="gap-2 sm:gap-0">
                                                <DialogClose asChild>
                                                    <button className="bg-black text-white border-2 border-white px-4 py-2 hover:bg-neutral-800 font-bold uppercase text-xs">Cancel</button>
                                                </DialogClose>
                                                <button
                                                    onClick={() => handleRevoke(invite.id)}
                                                    className="bg-red-600 text-white border-2 border-white px-4 py-2 hover:bg-red-700 font-bold uppercase text-xs"
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
                                <td colSpan={4} className="px-6 py-8 text-center text-white border-dashed">
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

