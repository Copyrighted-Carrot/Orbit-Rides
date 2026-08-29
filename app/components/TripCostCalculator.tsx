'use client'
import React, { useState } from 'react';
import { Car } from '@/lib/types/models';
import { 
    FaRoute, 
    FaGasPump, 
    FaReceipt, 
    FaCalculator, 
    FaArrowRightLong, 
    FaCarSide, 
    FaClock, 
    FaCircleInfo 
} from 'react-icons/fa6';

export default function TripCostCalculator({ car }: { car?: Car }) {
    const [originCity, setOriginCity] = useState('New York');
    const [destCity, setDestCity] = useState('Boston');
    const [distanceStr, setDistanceStr] = useState('350');
    
    const [tripDays, setTripDays] = useState(2);
    
    const dailyRentalRate = car ? car.price_per_day : 3500; 

    // Assume 30 MPG default if not present, and $3.5/gallon average
    const mileage = car?.mileage || 30;
    const fuelPricePerUnit = 3.5; 

    const roundTripDistance = parseInt(distanceStr) * 2;
    const distanceVal = isNaN(roundTripDistance) ? 0 : roundTripDistance;
    
    // cost = (distance / mileage) * pricePerGallon
    const estimatedFuelCost = Math.round((distanceVal / mileage) * fuelPricePerUnit);
    const totalRentalCost = dailyRentalRate * tripDays;
    const totalTolls = 50; // generic toll estimate
    const totalEstimatedCost = estimatedFuelCost + totalRentalCost + totalTolls;

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8">
            {/* Header Title */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">Smart Trip Planner</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaCalculator className="text-emerald-400" />
                        <span>Instant Trip Cost Estimator</span>
                    </h3>
                </div>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Route Selector */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaRoute className="text-emerald-400" /> Origin City
                    </label>
                    <input
                        type="text"
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                        className="bg-slate-950 text-white font-bold text-sm p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                    />
                </div>
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaRoute className="text-emerald-400" /> Dest City
                    </label>
                    <input
                        type="text"
                        value={destCity}
                        onChange={(e) => setDestCity(e.target.value)}
                        className="bg-slate-950 text-white font-bold text-sm p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                    />
                </div>
                
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaRoute className="text-emerald-400" /> Distance (one way)
                    </label>
                    <input
                        type="number"
                        value={distanceStr}
                        onChange={(e) => setDistanceStr(e.target.value)}
                        className="bg-slate-950 text-white font-bold text-sm p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                        placeholder="Miles"
                    />
                </div>

                {/* Rental Duration */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaClock className="text-emerald-400" /> Trip Duration
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={tripDays}
                            onChange={(e) => setTripDays(Number(e.target.value))}
                            className="w-full accent-emerald-400"
                        />
                        <span className="text-white font-extrabold text-sm w-12 shrink-0">{tripDays} Days</span>
                    </div>
                </div>

                {/* Daily Vehicle Rate */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaCarSide className="text-emerald-400" /> Vehicle Daily Rate
                    </label>
                    <div className="bg-slate-950 text-emerald-400 font-bold text-sm p-2.5 rounded-xl border border-white/10">
                        ₹{dailyRentalRate.toLocaleString('en-IN')}/day
                    </div>
                </div>
            </div>

            {/* ROUTE SUMMARY & WEATHER BADGE */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl border border-emerald-500/20">
                        <FaRoute />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                            <span>{originCity || 'Origin'}</span>
                            <FaArrowRightLong className="text-emerald-400 text-sm" />
                            <span>{destCity || 'Destination'}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                            Round Trip Estimate: {distanceVal} Miles
                        </span>
                    </div>
                </div>
            </div>

            {/* ITEMIZATION BREAKDOWN CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <FaGasPump className="text-emerald-400" /> Fuel Estimate
                    </span>
                    <span className="text-2xl font-extrabold text-white">₹{estimatedFuelCost.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500">Based on {distanceVal} miles round trip</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <FaCarSide className="text-emerald-400" /> Rental Fee
                    </span>
                    <span className="text-2xl font-extrabold text-white">₹{totalRentalCost.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500">₹{dailyRentalRate.toLocaleString('en-IN')}/day × {tripDays} days</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <FaReceipt className="text-emerald-400" /> Estimated Tolls
                    </span>
                    <span className="text-2xl font-extrabold text-white">₹{totalTolls.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500">Standard toll estimate</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-1">
                    <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                        <FaCircleInfo /> Total Trip Budget
                    </span>
                    <span className="text-3xl font-black text-emerald-400">₹{totalEstimatedCost.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-emerald-300/80">All-inclusive estimated expenditure</span>
                </div>
            </div>
        </div>
    );
}
