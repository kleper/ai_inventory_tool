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
            {/* KPI Cards - Compact Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard title="TOTAL INVENTORIES" value={data.total_inventories} />
                <KPICard title="TOTAL ITEMS" value={data.total_items} />
                <KPICard
                    title="VALUE (USD)"
                    value={formatCurrency(data.net_worth_usd)}
                    subtext="*Est."
                    className="col-span-2 lg:col-span-1"
                />
            </div>

            {/* Chart Section - Reduced Height */}
            <div className="w-full h-64 border border-black p-4 relative">
                <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 text-xs font-bold uppercase">
                    Category Distribution
                </div>
                <div className="mt-6 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.categories_distribution}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: 'black', fontFamily: 'monospace', fontSize: 10 }}
                                axisLine={{ stroke: 'black' }}
                                tickLine={false}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fill: 'black', fontFamily: 'monospace', fontSize: 10 }}
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

            {/* Quick Instructions */}
            <div className="border-t border-black pt-8">
                <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Quick Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full">1</span>
                        <h4 className="font-bold uppercase">Scan Items</h4>
                        <p className="text-gray-600">Use the camera to take a photo of your inventory. AI will auto-fill the details.</p>
                    </div>
                    <div className="space-y-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full">2</span>
                        <h4 className="font-bold uppercase">Organize</h4>
                        <p className="text-gray-600">Group items into folders (e.g., "Warehouse A", "Kitchen") to keep track of locations.</p>
                    </div>
                    <div className="space-y-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full">3</span>
                        <h4 className="font-bold uppercase">Share</h4>
                        <p className="text-gray-600">Generate public links to share read-only views of your items with others.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, subtext, className }: { title: string, value: string | number, subtext?: string, className?: string }) {
    return (
        <div className={`flex flex-col justify-between p-4 border border-black bg-white hover:bg-gray-50 transition-colors h-24 ${className}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 truncate">
                {title}
            </div>
            <div className="flex items-end justify-between">
                <div className="text-2xl font-bold tracking-tighter truncate">
                    {value}
                </div>
                {subtext && (
                    <div className="text-[10px] text-gray-500 uppercase pb-1">
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`border border-gray-200 bg-gray-50 animate-pulse p-4 h-24 ${i === 3 ? 'col-span-2 lg:col-span-1' : ''}`} />
                ))}
            </div>
            <div className="w-full h-64 border border-gray-200 bg-gray-50 animate-pulse" />
        </div>
    );
}
