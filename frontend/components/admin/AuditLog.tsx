"use client";

import useSWR from 'swr';
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/config";
import { useState } from 'react';
import { Loader2, Terminal, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";
// fetcher removed

export function AuditLog() {
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;
    const { data: logs, error, isLoading } = useSWR(token ? `${API_BASE_URL}/api/v1/admin/audit` : null, fetcher);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    if (error) return <div className="p-4 text-red-500">Failed to load audit logs</div>;
    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
            <div className="p-6 border-b border-black">
                <h3 className="text-lg font-bold uppercase tracking-tight text-black">Live Audit Log</h3>
                <p className="text-sm text-neutral-500 font-mono">Inspect recent AI transactions</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left font-mono">
                    <thead className="bg-neutral-50 text-black font-bold uppercase tracking-wide border-b border-black">
                        <tr>
                            <th className="px-6 py-3 border-r border-black last:border-0">Time</th>
                            <th className="px-6 py-3 border-r border-black last:border-0">User</th>
                            <th className="px-6 py-3 border-r border-black last:border-0">Task</th>
                            <th className="px-6 py-3 border-r border-black last:border-0">Model</th>
                            <th className="px-6 py-3 border-r border-black last:border-0">Cost</th>
                            <th className="px-6 py-3 border-r border-black last:border-0">Status</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {Array.isArray(logs) && logs.map((log: any) => (
                            <>
                                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-black border-r border-black/10">
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 font-bold border-r border-black/10">User {log.user_id}</td>
                                    <td className="px-6 py-4 border-r border-black/10">
                                        <span className={`px-2 py-1 text-xs font-bold border ${log.task_type === 'INVOICE_MATCHING' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {log.task_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-black border-r border-black/10">{log.model_name}</td>
                                    <td className="px-6 py-4 font-bold border-r border-black/10">${log.cost.toFixed(5)}</td>
                                    <td className="px-6 py-4 border-r border-black/10">
                                        {log.status === 'SUCCESS' ? (
                                            <span className="flex items-center gap-1 text-green-700 text-xs font-bold uppercase">
                                                <CheckCircle className="w-3 h-3" /> Success
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 text-xs font-bold uppercase">
                                                <XCircle className="w-3 h-3" /> Failed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                            className="text-black hover:text-neutral-600 font-bold uppercase text-xs underline decoration-1 underline-offset-4"
                                        >
                                            {expandedLogId === log.id ? 'Hide' : 'Inspect'}
                                        </button>
                                    </td>
                                </tr>
                                {expandedLogId === log.id && (
                                    <tr className="bg-neutral-50 border-b border-black">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-black mb-2 flex items-center gap-2">
                                                        <ImageIcon className="w-3 h-3" /> Input Image
                                                    </h4>
                                                    <div className="aspect-video bg-white rounded-none flex items-center justify-center text-xs text-neutral-400 border border-black p-1">
                                                        {/* In real app, render image from S3 URL. For blob, we can't show it unless we stored URL */}
                                                        {log.input_image_url && log.input_image_url.startsWith('http')
                                                            ? <img src={log.input_image_url} className="max-h-32 object-contain" alt="Input" />
                                                            : <span>Image not available (Blob)</span>
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-black mb-2 flex items-center gap-2">
                                                        <Terminal className="w-3 h-3" /> JSON Output
                                                    </h4>
                                                    <pre className="bg-white text-black border border-black p-3 rounded-none text-xs overflow-auto max-h-32 font-mono">
                                                        {log.output_json || "{}"}
                                                    </pre>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
