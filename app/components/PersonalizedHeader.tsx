'use client'
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    FaClockRotateLeft, 
    FaArrowRight, 
    FaCirclePlay 
} from 'react-icons/fa6';
import { getGreeting, getInitials, formatPrice } from '@/lib/util/util';

interface PersonalizedHeaderProps {
    userName: string | null;
    recentlyViewed: Array<{
        name: string;
        price: number;
        image: string;
        type: string;
        carId: number;
    }>;
    pendingBooking: {
        destination: string;
        dateRange: string;
        carId: number;
    } | null;
}

export default function PersonalizedHeader({ userName, recentlyViewed, pendingBooking }: PersonalizedHeaderProps) {
    const greeting = getGreeting();
    const initials = userName ? getInitials(userName) : 'G';
    const displayName = userName || 'Guest';

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            {/* PERSONALIZED GREETING BANNER */}
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 flex items-center gap-1.5">
                            ✦ Luxury Member Concierge
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                            {greeting}, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{displayName}</span> 👋
                        </h2>
                        <span className="text-xs text-slate-400 font-medium">Ready for your next high-performance drive?</span>
                    </div>
                </div>

                {/* CONTINUE UNFINISHED BOOKING BAR */}
                {pendingBooking && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 z-10 w-full md:w-auto shrink-0 justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                                <FaCirclePlay className="animate-pulse" /> Unfinished Booking
                            </span>
                            <span className="text-xs font-bold text-white">{pendingBooking.destination} ({pendingBooking.dateRange})</span>
                        </div>
                        <Link
                            href={`/customer/booking/step1?carId=${pendingBooking.carId}`}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center gap-1 shrink-0"
                        >
                            <span>Resume</span>
                            <FaArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}
            </div>

            {/* RECENTLY VIEWED VEHICLES STRIP */}
            {recentlyViewed && recentlyViewed.length > 0 && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/20 backdrop-blur-2xl shadow-xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaClockRotateLeft className="text-emerald-400 text-base" />
                            <h3 className="text-sm font-extrabold text-white">Recently Inspected Vehicles</h3>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Saved in Local Session</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recentlyViewed.map((car, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4 group hover:border-emerald-500/40 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative h-14 w-16 rounded-xl overflow-hidden shrink-0">
                                        <Image src={car.image} fill alt={car.name} className="object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{car.type}</span>
                                        <h4 className="text-sm font-extrabold text-white">{car.name}</h4>
                                        <span className="text-xs font-bold text-emerald-400">{formatPrice(car.price)} / day</span>
                                    </div>
                                </div>

                                <Link
                                    href={`/customer/cars/${car.carId}`}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 transition-all"
                                >
                                    <FaArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
