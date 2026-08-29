'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    FaChartLine, 
    FaDollarSign, 
    FaCar, 
    FaCalendarCheck, 
    FaCircleXmark, 
    FaArrowUpRightDots, 
    FaRankingStar,
    FaClock
} from 'react-icons/fa6';

interface AdminAnalyticsChartsProps {
    carCount: number;
    bookingCount: number;
    totalRevenue: number;
    recentBookings: Array<{
        id: number;
        booking_ref: string | null;
        status: string;
        total_price: number | null;
        created_at: string;
        car: { manufacturer: string; model: string; image?: string };
    }>;
    topVehicles: Array<{
        manufacturer: string;
        model: string;
        count: number;
        image?: string;
    }>;
}

export default function AdminAnalyticsCharts({ 
    carCount, 
    bookingCount, 
    totalRevenue, 
    recentBookings, 
    topVehicles 
}: AdminAnalyticsChartsProps) {
    const [selectedTimeframe, setSelectedTimeframe] = useState<'6M' | '1Y' | 'ALL'>('6M');

    // Create visual monthly revenue simulation based on totalRevenue
    const baseRev = Math.max(totalRevenue / 6, 1000); // just to show something
    const monthlyRevenue = [
        { month: 'Mar', revenue: baseRev * 0.4, bookings: Math.floor(bookingCount * 0.1) },
        { month: 'Apr', revenue: baseRev * 0.5, bookings: Math.floor(bookingCount * 0.12) },
        { month: 'May', revenue: baseRev * 0.7, bookings: Math.floor(bookingCount * 0.15) },
        { month: 'Jun', revenue: baseRev * 0.9, bookings: Math.floor(bookingCount * 0.18) },
        { month: 'Jul', revenue: baseRev * 1.1, bookings: Math.floor(bookingCount * 0.2) },
        { month: 'Aug', revenue: baseRev * 1.2, bookings: Math.floor(bookingCount * 0.25) },
    ];

    const maxRevenue = Math.max(...monthlyRevenue.map((d) => d.revenue), 1);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'completed': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto">
            {/* TOP KPI STATS METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Gross Revenue */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gross Revenue</span>
                        <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-base">
                            <FaDollarSign />
                        </span>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalRevenue)}</span>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-1">
                        <FaArrowUpRightDots />
                        <span>Based on confirmed/active/completed</span>
                    </div>
                </div>

                {/* Total Bookings */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Bookings</span>
                        <span className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 text-base">
                            <FaCalendarCheck />
                        </span>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tight">{bookingCount}</span>
                    <span className="text-xs text-slate-400 font-medium mt-1">All time bookings</span>
                </div>

                {/* Active Fleet */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Fleet</span>
                        <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-base">
                            <FaCar />
                        </span>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tight">{carCount}</span>
                    <span className="text-xs text-emerald-400 font-bold mt-1">Total registered vehicles</span>
                </div>

                {/* Cancellation Rate */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cancellation Rate</span>
                        <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-base">
                            <FaCircleXmark />
                        </span>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tight">
                        {bookingCount > 0 ? ((recentBookings.filter(b => b.status === 'cancelled').length / Math.max(1, recentBookings.length)) * 100).toFixed(1) : '0.0'}%
                    </span>
                    <span className="text-xs text-emerald-400 font-bold mt-1">Recent trend</span>
                </div>
            </div>

            {/* MONTHLY REVENUE GROWTH CHART */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                    <div>
                        <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">Financial Growth</span>
                        <h3 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-3">
                            <FaChartLine className="text-emerald-400" />
                            <span>Revenue Trend (Simulated)</span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs">
                        {(['6M', '1Y', 'ALL'] as const).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setSelectedTimeframe(tf)}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    selectedTimeframe === tf
                                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interactive SVG Bar Graph */}
                <div className="flex flex-col gap-4">
                    <div className="h-64 w-full flex items-end justify-between gap-4 pt-8 px-4 border-b border-white/10 relative">
                        {totalRevenue > 0 ? monthlyRevenue.map((d, idx) => {
                            const barHeightPercent = (d.revenue / maxRevenue) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                    {/* Hover Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] p-2 rounded-xl border border-emerald-500/40 shadow-xl flex flex-col items-center gap-0.5 pointer-events-none mb-1 z-10">
                                        <span className="font-extrabold text-emerald-400">{formatCurrency(d.revenue)}</span>
                                        <span className="text-[10px] text-slate-400">{d.bookings} Bookings</span>
                                    </div>

                                    {/* Bar Pillar */}
                                    <div className="w-full max-w-[48px] bg-white/5 rounded-t-2xl overflow-hidden relative h-full flex items-end">
                                        <div
                                            className="w-full bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300 rounded-t-2xl group-hover:brightness-125 transition-all duration-700 shadow-lg shadow-emerald-500/20"
                                            style={{ height: `${Math.max(barHeightPercent, 2)}%` }}
                                        />
                                    </div>

                                    <span className="text-xs text-slate-400 font-bold group-hover:text-emerald-400 transition-colors">
                                        {d.month}
                                    </span>
                                </div>
                            );
                        }) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                No revenue data yet to chart.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* POPULAR CARS LEADERBOARD & RECENT BOOKINGS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular Cars Leaderboard */}
                <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                            <FaRankingStar className="text-emerald-400 text-xl" />
                            <h3 className="text-xl font-extrabold text-white">Top Performing Vehicles</h3>
                        </div>
                        <Link href="/admin/cars" className="text-xs text-emerald-400 font-bold hover:underline">
                            Manage Fleet →
                        </Link>
                    </div>

                    <div className="flex flex-col gap-4">
                        {topVehicles.length > 0 ? topVehicles.map((car, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4 hover:border-emerald-500/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 text-center text-sm font-black text-emerald-400">
                                        #{idx + 1}
                                    </span>
                                    <div className="relative h-14 w-16 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                                        {car.image ? (
                                            <Image src={car.image} fill alt={car.model} className="object-cover" />
                                        ) : (
                                            <FaCar className="text-slate-600 m-auto h-full text-2xl" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-sm font-bold text-white truncate">{car.manufacturer} {car.model}</h4>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-base font-black text-emerald-400">{car.count} Bookings</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-500">
                                No vehicles booked yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Bookings List */}
                <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                            <FaClock className="text-emerald-400 text-xl" />
                            <h3 className="text-xl font-extrabold text-white">Recent Bookings</h3>
                        </div>
                        <Link href="/admin/bookings" className="text-xs text-emerald-400 font-bold hover:underline">
                            View All →
                        </Link>
                    </div>

                    <div className="flex flex-col gap-4">
                        {recentBookings.length > 0 ? recentBookings.map((booking, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/30 transition-all">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-white flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                        {booking.car?.manufacturer} {booking.car?.model}
                                    </span>
                                    <span className="text-emerald-400 font-extrabold">{formatCurrency(booking.total_price ?? 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                                    <span>Ref: {booking.booking_ref}</span>
                                    <span>{new Date(booking.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-500">
                                No recent bookings.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
