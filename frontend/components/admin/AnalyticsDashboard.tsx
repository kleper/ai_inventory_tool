"use client";

import { useMemo } from 'react';
import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/config";

import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";
// fetcher removed

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AnalyticsDashboard() {
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;
    const { data, error, isLoading } = useSWR(token ? `${API_BASE_URL}/api/v1/admin/stats/usage` : null, fetcher);

    // Calculate totals
    const totals = useMemo(() => {
        if (!data || !data.daily_usage) return { cost: 0, tokens: 0 };
        const totalCost = data.daily_usage.reduce((acc: number, curr: any) => acc + (curr.cost || 0), 0);
        const totalTokens = data.daily_usage.reduce((acc: number, curr: any) => acc + (curr.tokens || 0), 0);
        return { cost: totalCost, tokens: totalTokens };
    }, [data]);

    if (error) return <div className="p-4 text-red-600 font-mono text-xs border border-red-500 bg-red-50 uppercase">Failed to load analytics: {error?.message || "Internal Server Error"}</div>;
    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!data) return null;

    const MONO_COLORS = ['#000000', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-black rounded-none shadow-none">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Total AI Cost (7d)</span>
                            <DollarSign className="w-4 h-4 text-black" />
                        </div>
                        <h3 className="text-4xl font-bold font-mono tracking-tighter">${totals.cost.toFixed(4)}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 border border-black rounded-none shadow-none">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Total Tokens (7d)</span>
                            <Activity className="w-4 h-4 text-black" />
                        </div>
                        <h3 className="text-4xl font-bold font-mono tracking-tighter">{totals.tokens.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost per Day */}
                <div className="bg-white p-6 border border-black rounded-none shadow-none flex flex-col min-h-[420px]">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black pb-2 text-black">Daily Cost Trend</h3>
                    <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
                        {!data.daily_usage || data.daily_usage.length === 0 ? (
                            <span className="font-mono text-xs text-neutral-500 uppercase">No usage activity in this period</span>
                        ) : (
                            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={250}>
                                <BarChart data={data.daily_usage}>
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#000" />
                                    <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#000" />
                                    <Tooltip
                                        cursor={{ fill: '#f4f4f5' }}
                                        contentStyle={{ backgroundColor: '#fff', color: '#000', border: '1px solid #000', borderRadius: '0px', padding: '8px' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "COST"]}
                                        labelStyle={{ fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}
                                        itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="cost" fill="#000000" radius={[0, 0, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* User Distribution */}
                <div className="bg-white p-6 border border-black rounded-none shadow-none flex flex-col min-h-[420px]">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-black pb-2 text-black">Cost by User</h3>
                    <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
                        {!data.user_distribution || data.user_distribution.length === 0 ? (
                            <span className="font-mono text-xs text-neutral-500 uppercase">No user distribution recorded</span>
                        ) : (
                            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={250}>
                                <PieChart>
                                    <Pie
                                        data={data.user_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        fill="#000"
                                        dataKey="cost"
                                        nameKey="user_id"
                                        stroke="#000"
                                    >
                                        {data.user_distribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={MONO_COLORS[index % MONO_COLORS.length]} stroke="#000000" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', color: '#000', border: '1px solid #000', borderRadius: '0px', padding: '8px' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "COST"]}
                                        itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        iconType="square"
                                        formatter={(value: string) => <span className="font-mono text-xs uppercase ml-2 text-black">User {value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
