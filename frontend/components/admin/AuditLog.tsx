"use client";

import useSWR from 'swr';
import { useState } from 'react';
import { Loader2, Terminal, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function AuditLog() {
    const { data: logs, error, isLoading } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/audit`, fetcher);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    if (error) return <div className="p-4 text-red-500">Failed to load audit logs</div>;
    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-neutral-700">
                <h3 className="text-lg font-semibold">Live Audit Log</h3>
                <p className="text-sm text-gray-500">Inspect recent AI transactions</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-neutral-900 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Task</th>
                            <th className="px-6 py-3">Model</th>
                            <th className="px-6 py-3">Cost</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                        {logs?.map((log: any) => (
                            <>
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-neutral-750 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">User {log.user_id}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${log.task_type === 'INVOICE_MATCHING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {log.task_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{log.model_name}</td>
                                    <td className="px-6 py-4 font-mono">${log.cost.toFixed(5)}</td>
                                    <td className="px-6 py-4">
                                        {log.status === 'SUCCESS' ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                <CheckCircle className="w-3 h-3" /> Success
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                                <XCircle className="w-3 h-3" /> Failed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                            className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                                        >
                                            {expandedLogId === log.id ? 'Hide' : 'Inspect'}
                                        </button>
                                    </td>
                                </tr>
                                {expandedLogId === log.id && (
                                    <tr className="bg-gray-50 dark:bg-zinc-900/50">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 flex items-center gap-2">
                                                        <ImageIcon className="w-3 h-3" /> Input Image
                                                    </h4>
                                                    <div className="aspect-video bg-gray-200 dark:bg-black rounded-lg flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-300">
                                                        {/* In real app, render image from S3 URL. For blob, we can't show it unless we stored URL */}
                                                        {log.input_image_url && log.input_image_url.startsWith('http')
                                                            ? <img src={log.input_image_url} className="max-h-32 rounded" alt="Input" />
                                                            : <span>Image not available (Blob)</span>
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 flex items-center gap-2">
                                                        <Terminal className="w-3 h-3" /> JSON Output
                                                    </h4>
                                                    <pre className="bg-black text-green-400 p-3 rounded-lg text-xs overflow-auto max-h-32 font-mono">
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
