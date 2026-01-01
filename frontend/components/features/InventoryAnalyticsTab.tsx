"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { DollarSign, Box } from "lucide-react";
import { formatCurrency, calculateInventoryTotal } from "@/lib/currency";

interface InventoryAnalyticsTabProps {
    items: any[];
    currency?: string;
}

export function InventoryAnalyticsTab({ items, currency = "USD" }: InventoryAnalyticsTabProps) {
    // 1. Calculate KPIs
    const stats = useMemo(() => {
        const totalValuation = calculateInventoryTotal(items);
        const totalItems = items.length;

        let sumPrices = 0;
        let countPrices = 0;
        items.forEach(item => {
            if (item.price) {
                sumPrices += parseFloat(item.price);
                countPrices++;
            }
        });
        const simpleAvgPrice = countPrices > 0 ? sumPrices / countPrices : 0;

        return {
            totalValuation,
            totalItems,
            avgPrice: simpleAvgPrice
        };
    }, [items]);

    // 2. Prepare Chart Data
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
            const cat = item.category || "Uncategorized";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [items]);

    const completionData = useMemo(() => {
        let completed = 0;
        let pending = 0;
        items.forEach(item => {
            // "Completed" definition per prompt: Photo + Price + Name
            // Logic: item.image_url (SecureImage usually handles check) && item.price && item.name
            if (item.image_url && item.price && item.name && item.status !== 'pending_price') {
                completed++;
            } else {
                pending++;
            }
        });
        return [
            { name: "Completed", value: completed },
            { name: "Pending", value: pending }
        ];
    }, [items]);

    // 3. Top Assets
    const topAssets = useMemo(() => {
        return [...items]
            .sort((a, b) => ((b.price || 0) * (b.quantity || 1)) - ((a.price || 0) * (a.quantity || 1)))
            .slice(0, 3);
    }, [items]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-black p-2 rounded-none shadow-none">
                    <p className="font-mono text-xs uppercase">{`${label}: ${payload[0].value}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-black p-6 rounded-none flex flex-col justify-between h-32">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Total Valuation</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-mono tracking-tighter">
                            {formatCurrency(stats.totalValuation, currency)}
                        </span>
                    </div>
                </div>
                <div className="bg-white border border-black p-6 rounded-none flex flex-col justify-between h-32">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Total Items</span>
                    <div className="flex items-center gap-2">
                        <Box className="w-6 h-6" />
                        <span className="text-4xl font-bold font-mono tracking-tighter">
                            {stats.totalItems}
                        </span>
                    </div>
                </div>
                <div className="bg-white border border-black p-6 rounded-none flex flex-col justify-between h-32">
                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Avg. Unit Price</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-mono tracking-tighter">
                            {formatCurrency(stats.avgPrice, currency)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="bg-white border border-black p-6 rounded-none h-80 flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Category Distribution</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={categoryData}>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#000" />
                                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#000" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
                                <Bar dataKey="value" fill="#000" radius={[0, 0, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-white border border-black p-6 rounded-none h-80 flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Inventory Status</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={completionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    stroke="#000"
                                >
                                    {completionData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name === 'Completed' ? '#000000' : '#ffffff'}
                                            stroke="#000000"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    iconType="square"
                                    formatter={(value: string) => <span className="font-mono text-xs uppercase ml-2 text-black">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Assets */}
            <div className="bg-white border border-black p-6 rounded-none">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> High Value Assets
                </h3>
                {topAssets.length > 0 ? (
                    <div className="w-full text-left border-t border-black">
                        <div className="grid grid-cols-12 border-b border-black py-2 bg-neutral-50 text-[10px] uppercase font-bold tracking-widest">
                            <div className="col-span-1 pl-2">#</div>
                            <div className="col-span-7">Item Name</div>
                            <div className="col-span-4 text-right pr-2">Total Value</div>
                        </div>
                        {topAssets.map((asset, idx) => (
                            <div key={asset.id} className="grid grid-cols-12 border-b border-black py-3 text-sm hover:bg-neutral-50 transition-colors">
                                <div className="col-span-1 pl-2 font-mono text-neutral-500">{idx + 1}</div>
                                <div className="col-span-7 font-bold truncate pr-2">
                                    {asset.name || "Untitled Asset"}
                                    {asset.quantity > 1 && <span className="text-xs text-neutral-500 ml-2 font-mono">x{asset.quantity}</span>}
                                </div>
                                <div className="col-span-4 text-right font-mono pr-2">
                                    {formatCurrency((asset.price || 0) * (asset.quantity || 1), currency)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-neutral-500 font-mono text-sm border-t border-black">
                        No financial data available.
                    </div>
                )}
            </div>
        </div>
    );
}
