"use client";

import React from 'react';
import useSWR from 'swr';
import { useAuthFetcher } from "@/hooks/useAuthFetcher";
import { useSession } from "next-auth/react";
import { API_BASE_URL } from '@/lib/config';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

// Types
interface CategoryStat {
    name: string;
    count: number;
}

interface AnalyticsOverview {
    total_inventories: number;
    total_items: number;
    net_worth_usd: number;
    categories_distribution: CategoryStat[];
}

export default function UserGlobalDashboard() {
    const { data: session } = useSession();
    const fetcher = useAuthFetcher();
    const token = (session as any)?.accessToken;

    const { data, error, isLoading } = useSWR<AnalyticsOverview>(
        token ? `${API_BASE_URL}/api/v1/analytics/overview` : null,
        fetcher
    );

    if (error) return <div className="p-4 border border-black font-mono text-red-600">FAILED TO LOAD ANALYTICS DATA.</div>;

    if (isLoading || !data) {
        return <DashboardSkeleton />;
    }

    // Format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(val);
    };

    return (
        <div className="w-full space-y-8 font-mono">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard title="TOTAL INVENTORIES" value={data.total_inventories} />
                <KPICard title="TOTAL ITEMS" value={data.total_items} />
                <KPICard
                    title="ESTIMATED VALUE (USD)"
                    value={formatCurrency(data.net_worth_usd)}
                    subtext="*Converted to USD"
                />
            </div>

            {/* Chart Section */}
            <div className="w-full h-80 border border-black p-4 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 text-xs font-bold uppercase">
                    Category Distribution
                </div>
                <div className="mt-6 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.categories_distribution}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: 'black', fontFamily: 'monospace', fontSize: 12 }}
                                axisLine={{ stroke: 'black' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: 'black', fontFamily: 'monospace', fontSize: 12 }}
                                axisLine={{ stroke: 'black' }}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid black',
                                    fontFamily: 'monospace',
                                    borderRadius: 0
                                }}
                                itemStyle={{ color: 'black' }}
                                cursor={{ fill: '#f1f1f1' }}
                            />
                            <Bar dataKey="count" fill="black" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, subtext }: { title: string, value: string | number, subtext?: string }) {
    return (
        <div className="aspect-square flex flex-col justify-between p-4 border border-black bg-white hover:bg-gray-50 transition-colors">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                {title}
            </div>
            <div className="text-right">
                <div className="text-4xl font-bold tracking-tighter break-all">
                    {value}
                </div>
                {subtext && (
                    <div className="text-xs text-gray-500 mt-1 uppercase">
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="w-full space-y-8 font-mono">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square border border-gray-200 bg-gray-50 animate-pulse p-4 flex flex-col justify-between">
                        <div className="h-4 w-32 bg-gray-200" />
                        <div className="self-end h-10 w-24 bg-gray-200" />
                    </div>
                ))}
            </div>
            <div className="w-full h-80 border border-gray-200 bg-gray-50 animate-pulse" />
        </div>
    );
}
