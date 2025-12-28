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
        if (!data) return { cost: 0, tokens: 0 };
        const totalCost = data.daily_usage.reduce((acc: number, curr: any) => acc + curr.cost, 0);
        const totalTokens = data.daily_usage.reduce((acc: number, curr: any) => acc + curr.tokens, 0);
        return { cost: totalCost, tokens: totalTokens };
    }, [data]);

    if (error) return <div className="p-4 text-red-500">Failed to load analytics</div>;
    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total AI Cost (7d)</p>
                            <h3 className="text-2xl font-bold">${totals.cost.toFixed(4)}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Tokens (7d)</p>
                            <h3 className="text-2xl font-bold">{totals.tokens.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost per Day */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Daily Cost Trend</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.daily_usage}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none' }}
                                    formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                                />
                                <Legend />
                                <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Distribution */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Cost by User</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.user_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="cost"
                                    nameKey="user_id"
                                    label={({ name, percent }: any) => `User ${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {data.user_distribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "Cost"]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
