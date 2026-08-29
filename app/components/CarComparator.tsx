'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Car } from '@/lib/types/models';
import { 
    FaCodeCompare, 
    FaCircleCheck, 
    FaPlus 
} from 'react-icons/fa6';

interface CarComparatorProps {
    cars: Car[];
}

export default function CarComparator({ cars }: CarComparatorProps) {
    const validCarIds = (cars || []).map((c) => c.id).filter((id): id is number => typeof id === 'number');
    const [selectedCarIds, setSelectedCarIds] = useState<number[]>(
        validCarIds.length >= 2 ? [validCarIds[0], validCarIds[1]] : validCarIds.length === 1 ? [validCarIds[0]] : []
    );

    if (!cars || cars.length === 0) {
        return (
            <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8 text-center text-white">
                <h3 className="text-2xl font-bold">No Vehicles Available for Comparison</h3>
            </div>
        );
    }

    const comparedCars = cars.filter((c) => c.id !== undefined && selectedCarIds.includes(c.id));

    const toggleCarSelection = (id?: number) => {
        if (!id) return;
        if (selectedCarIds.includes(id)) {
            if (selectedCarIds.length > 1) {
                setSelectedCarIds(selectedCarIds.filter((item) => item !== id));
            }
        } else {
            if (selectedCarIds.length < 3) {
                setSelectedCarIds([...selectedCarIds, id]);
            }
        }
    };

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">Head-to-Head</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaCodeCompare className="text-emerald-400" />
                        <span>Visual Fleet Comparator</span>
                    </h3>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                    Comparing {comparedCars.length} of 3 Max Vehicles
                </span>
            </div>

            {/* Vehicle Selector Buttons */}
            <div className="flex flex-wrap gap-2">
                {cars.map((c, idx) => {
                    const isSelected = c.id !== undefined && selectedCarIds.includes(c.id);
                    return (
                        <button
                            key={c.id || idx}
                            onClick={() => toggleCarSelection(c.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                                isSelected
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                            }`}
                        >
                            {isSelected ? <FaCircleCheck className="text-emerald-400" /> : <FaPlus />}
                            <span>{c.manufacturer} {c.model}</span>
                        </button>
                    );
                })}
            </div>

            {/* SIDE-BY-SIDE VISUAL COMPARISON GRID */}
            <div className={`grid grid-cols-1 md:grid-cols-${Math.max(1, comparedCars.length)} gap-6`}>
                {comparedCars.map((car) => (
                    <div
                        key={car.id}
                        className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col gap-6 relative"
                    >
                        {/* Vehicle Image & Overview */}
                        <div className="flex flex-col gap-3">
                            <div className="relative h-44 w-full rounded-xl overflow-hidden">
                                <Image
                                    src={car.img_urls && car.img_urls.length > 0 ? car.img_urls[0] : '/images/car-owners.jpg'}
                                    fill
                                    alt={`${car.manufacturer} ${car.model}`}
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
                                    {car.manufacturer}
                                </span>
                                <h4 className="text-xl font-extrabold text-white">{car.model}</h4>
                                <span className="text-base font-extrabold text-emerald-400">₹{car.price_per_day.toLocaleString('en-IN')} / day</span>
                            </div>
                        </div>

                        {/* VISUAL METRIC BARS */}
                        <div className="flex flex-col gap-4 border-t border-white/10 pt-4 text-xs">
                            <MetricBar
                                label="Engine Power & HP"
                                score={car.horsepower ? Math.min(100, car.horsepower / 10) : 50}
                                value={car.horsepower ? `${car.horsepower} HP` : 'N/A'}
                            />
                            <MetricBar
                                label="0-60 mph Launch"
                                score={car.zero_to_sixty ? Math.max(10, 100 - (car.zero_to_sixty * 10)) : 50}
                                value={car.zero_to_sixty ? `${car.zero_to_sixty} s` : 'N/A'}
                            />
                            <MetricBar
                                label="Fuel / Energy Economy"
                                score={car.mileage ? Math.min(100, car.mileage * 2) : 50}
                                value={car.mileage ? `${car.mileage} MPG` : 'N/A'}
                            />
                            <MetricBar
                                label="Cabin Space"
                                score={Math.min(100, car.seats * 15)}
                                value={`${car.seats} Seats`}
                            />
                        </div>

                        {/* Specs Summary Row */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-medium border-t border-white/10 pt-4">
                            <div className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                                <span className="text-slate-400">Category</span>
                                <span className="font-bold text-white">{car.type_display || 'Exotic'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                                <span className="text-slate-400">Color</span>
                                <span
                                    className="w-3.5 h-3.5 rounded-full border border-white"
                                    style={{ backgroundColor: car.color || '#000' }}
                                />
                            </div>
                        </div>

                        {/* Select Vehicle CTA */}
                        <Link
                            href="/customer"
                            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs text-center tracking-wider uppercase transition-colors mt-auto shadow-md"
                        >
                            Reserve This Vehicle
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricBar({ label, score, value }: { label: string; score: number; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300 font-medium">
                <span>{label}</span>
                <span className="text-emerald-400 font-bold">{value}</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}
