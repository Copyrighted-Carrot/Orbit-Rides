'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Car } from '@/lib/types/models';
import { 
    FaWandMagicSparkles, 
    FaUserGroup, 
    FaMountain, 
    FaIndianRupeeSign, 
    FaArrowRight 
} from 'react-icons/fa6';

interface SmartCarRecommenderProps {
    cars: Car[];
}

export default function SmartCarRecommender({ cars }: SmartCarRecommenderProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [purpose, setPurpose] = useState<'Family' | 'Business' | 'Hill Station' | 'Getaway' | 'Off-Road'>('Family');
    const [terrain, setTerrain] = useState<'Hill Station' | 'Coastal Highway' | 'City Cruising' | 'Interstate'>('Hill Station');
    const [passengers, setPassengers] = useState<2 | 4 | 5 | 7>(5);
    const [maxBudget, setMaxBudget] = useState<number>(5000);
    const [hasCalculated, setHasCalculated] = useState(false);

    // Recommendation Algorithm
    const getTopRecommendations = () => {
        if (!cars || cars.length === 0) {
            return [];
        }

        return cars
            .map((car) => {
                let score = 75;

                // Seat match
                if (car.seats >= passengers) score += 10;
                // Budget match
                if (car.price_per_day <= maxBudget) score += 10;
                
                // Type/Terrain Match
                const typeName = car.type_display?.toLowerCase() || '';
                if (purpose === 'Family' && typeName.includes('suv')) score += 5;
                if (purpose === 'Business' && typeName.includes('sedan')) score += 5;
                if (purpose === 'Off-Road' && typeName.includes('suv')) score += 5;

                score = Math.min(99, Math.max(0, score));

                return {
                    ...car,
                    matchScore: score,
                    reason: `Tailored for ${purpose} trips on ${terrain} with up to ${passengers} passengers.`,
                };
            })
            // Must meet budget and passenger criteria reasonably to be "matched"
            .filter(c => c.price_per_day <= maxBudget && c.seats >= passengers)
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3);
    };

    const handleCalculate = () => {
        setHasCalculated(true);
    };

    const recommendations = getTopRecommendations();

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">AI Match Engine</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaWandMagicSparkles className="text-emerald-400" />
                        <span>Smart Vehicle Recommender</span>
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((stepNum) => (
                        <div
                            key={stepNum}
                            className={`w-8 h-2 rounded-full transition-all ${
                                step >= stepNum ? 'bg-emerald-400 shadow-md shadow-emerald-500/30' : 'bg-white/10'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* WIZARD STEPS */}
            {!hasCalculated ? (
                <div className="flex flex-col gap-6">
                    {/* Step 1: Purpose */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <h4 className="text-lg font-bold text-white">Step 1: What is the main purpose of your trip?</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {(['Family', 'Business', 'Hill Station', 'Getaway', 'Off-Road'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPurpose(p)}
                                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                                            purpose === p
                                                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-base font-bold">{p}</span>
                                        <span className="text-[11px] opacity-75">Curated vehicle match</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Terrain */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaMountain className="text-emerald-400" /> Step 2: What terrain will you be driving on?
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {(['Hill Station', 'Coastal Highway', 'City Cruising', 'Interstate'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTerrain(t)}
                                        className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                                            terrain === t
                                                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-base font-bold">{t}</span>
                                        <span className="text-[11px] opacity-75">Optimized handling</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Passengers */}
                    {step === 3 && (
                        <div className="flex flex-col gap-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaUserGroup className="text-emerald-400" /> Step 3: How many passengers are traveling?
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {([2, 4, 5, 7] as const).map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => setPassengers(count)}
                                        className={`p-4 rounded-2xl border text-center flex flex-col gap-1 transition-all ${
                                            passengers === count
                                                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-2xl font-black">{count}</span>
                                        <span className="text-xs text-slate-400">Passengers</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Budget */}
                    {step === 4 && (
                        <div className="flex flex-col gap-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaIndianRupeeSign className="text-emerald-400" /> Step 4: What is your daily budget limit?
                            </h4>
                            <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 flex flex-col gap-4">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-400">Maximum Daily Rate</span>
                                    <span className="text-2xl font-extrabold text-emerald-400">₹{maxBudget.toLocaleString('en-IN')} / day</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="5000"
                                    step="10"
                                    value={maxBudget}
                                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                                    className="w-full accent-emerald-400"
                                />
                            </div>
                        </div>
                    )}

                    {/* Wizard Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
                                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                            >
                                ← Back
                            </button>
                        ) : <div />}

                        {step < 4 ? (
                            <button
                                onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
                                className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase"
                            >
                                Next Step →
                            </button>
                        ) : (
                            <button
                                onClick={handleCalculate}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/20"
                            >
                                Find Perfect Matches ★
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* RESULTS DISPLAY */
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">AI Results</span>
                            <h4 className="text-xl font-extrabold text-white mt-0.5">Recommended Vehicles</h4>
                        </div>
                        <button
                            onClick={() => setHasCalculated(false)}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10"
                        >
                            🔄 Reset Filters
                        </button>
                    </div>

                    {recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendations.map((car, idx) => (
                                <div
                                    key={idx}
                                    className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col gap-4 relative group hover:border-emerald-500/40 transition-all"
                                >
                                    {/* Match Score Badge */}
                                    <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black tracking-wider uppercase shadow-lg">
                                        {car.matchScore}% Match
                                    </div>

                                    <div className="relative h-44 w-full rounded-xl overflow-hidden">
                                        <Image
                                            src={car.img_urls && car.img_urls.length > 0 ? car.img_urls[0] : '/images/car-owners.jpg'}
                                            fill
                                            alt={`${car.manufacturer} ${car.model}`}
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-widest">
                                            {car.manufacturer}
                                        </span>
                                        <h5 className="text-lg font-bold text-white">{car.model}</h5>
                                        <p className="text-xs text-slate-400 font-light mt-1 leading-relaxed">
                                            {car.reason}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-medium">Daily Rate</span>
                                            <span className="text-base font-extrabold text-emerald-400">₹{car.price_per_day.toLocaleString('en-IN')}</span>
                                        </div>

                                        <Link
                                            href="/customer"
                                            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
                                        >
                                            <span>Select</span>
                                            <FaArrowRight />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-slate-900 border border-white/10 rounded-2xl text-slate-300">
                            <p>No vehicles match your criteria. Try adjusting your preferences.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
