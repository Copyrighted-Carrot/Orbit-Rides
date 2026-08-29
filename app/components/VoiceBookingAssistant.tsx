'use client'
import React, { useState } from 'react';
import { 
    FaKeyboard, 
    FaArrowRight, 
    FaCheck,
    FaMagnifyingGlass
} from 'react-icons/fa6';
import Link from 'next/link';
import { Car } from '@/lib/types/models';

interface QuickBookAssistantProps {
    availableCars?: Car[];
}

export default function QuickBookAssistant({ availableCars = [] }: QuickBookAssistantProps) {
    const [query, setQuery] = useState('');
    const [matchedCar, setMatchedCar] = useState<Car | null>(null);

    const handleSearch = () => {
        if (!query.trim()) return;

        const lowerQuery = query.toLowerCase();
        const match = availableCars.find(car => 
            lowerQuery.includes(car.manufacturer.toLowerCase()) || 
            lowerQuery.includes(car.model.toLowerCase()) ||
            lowerQuery.includes((car.type_display || '').toLowerCase())
        );

        setMatchedCar(match || null);
    };

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">Quick Actions</span>
                    <h3 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaKeyboard className="text-emerald-400" />
                        <span>Quick Book</span>
                    </h3>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                    ✦ Text-Based Smart Search
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-slate-900 border border-white/10">
                <div className="flex-1 w-full flex items-center bg-slate-950 border border-white/10 rounded-xl px-4 py-3">
                    <FaMagnifyingGlass className="text-slate-500 mr-3" />
                    <input 
                        type="text" 
                        placeholder="e.g. BMW for next weekend" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-slate-600"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="px-6 py-3 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 hover:scale-105 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center transition-all shrink-0 w-full sm:w-auto"
                >
                    Search
                </button>
            </div>

            {matchedCar && (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 text-base font-bold">
                            <FaCheck />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">Match Found</span>
                            <h4 className="text-sm font-bold text-white">{matchedCar.manufacturer} {matchedCar.model}</h4>
                            <span className="text-xs text-slate-400">₹{matchedCar.price_per_day?.toLocaleString('en-IN')} / day</span>
                        </div>
                    </div>

                    <Link
                        href={`/customer/booking/step1?carId=${matchedCar.id}`}
                        className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all shrink-0"
                    >
                        <span>Book Now</span>
                        <FaArrowRight />
                    </Link>
                </div>
            )}

            {query && !matchedCar && (
                <div className="text-sm text-slate-400 px-2 mt-2">No specific vehicle matched your query. Try a different search!</div>
            )}
        </div>
    );
}
