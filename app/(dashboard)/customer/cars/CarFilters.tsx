'use client';

import React, { useState, useMemo } from 'react';
import { Car } from '@/lib/types/models';
import CarCard from './CarCard';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { AnimatePresence, m } from 'framer-motion';

interface CarFiltersProps {
    cars: Car[];
    rentDaysCount: number;
    pickupData: string;
    deliveryLocation: string;
    carTypes: Array<{ value: number; label: string }>;
}

export default function CarFilters({ cars, rentDaysCount, pickupData, deliveryLocation, carTypes }: CarFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
    const [priceRange, setPriceRange] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<number | null>(null);
    const [transmission, setTransmission] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string | null>(null);

    const filteredCars = useMemo(() => {
        let result = [...cars];

        if (selectedTypes.length > 0) {
            result = result.filter(car => selectedTypes.includes(car.type_id));
        }

        if (priceRange) {
            result = result.filter(car => {
                if (priceRange === 'budget') return car.price_per_day < 3000;
                if (priceRange === 'mid') return car.price_per_day >= 3000 && car.price_per_day <= 8000;
                if (priceRange === 'premium') return car.price_per_day > 8000 && car.price_per_day <= 15000;
                if (priceRange === 'ultra') return car.price_per_day > 15000;
                return true;
            });
        }

        if (selectedSeats) {
            result = result.filter(car => {
                if (selectedSeats === 7) return car.seats >= 7;
                return car.seats === selectedSeats;
            });
        }

        if (transmission) {
            result = result.filter(car => car.transmission?.toLowerCase() === transmission.toLowerCase());
        }

        if (sortBy) {
            if (sortBy === 'price_asc') {
                result.sort((a, b) => a.price_per_day - b.price_per_day);
            } else if (sortBy === 'price_desc') {
                result.sort((a, b) => b.price_per_day - a.price_per_day);
            } else if (sortBy === 'newest') {
                result.sort((a, b) => (b.year || 0) - (a.year || 0));
            }
        }

        return result;
    }, [cars, selectedTypes, priceRange, selectedSeats, transmission, sortBy]);

    const activeFilterCount = selectedTypes.length + (priceRange ? 1 : 0) + (selectedSeats ? 1 : 0) + (transmission ? 1 : 0) + (sortBy ? 1 : 0);

    const clearAll = () => {
        setSelectedTypes([]);
        setPriceRange(null);
        setSelectedSeats(null);
        setTransmission(null);
        setSortBy(null);
    };

    const toggleType = (id: number) => {
        setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    return (
        <section className="flex flex-col gap-6 py-8 relative w-full">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className='text-3xl lg:text-4xl z-10'>
                    <h2 className='text-[length:inherit] font-bold text-white'>
                        Choose a car that <span className='text-[length:inherit] font-bold bg-gradient-to-br from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent'>fits you!</span>
                    </h2>
                </div>
                
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn btn-outline border-white/20 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-white rounded-full px-6 flex items-center gap-2 transition-all bg-slate-900/50 backdrop-blur-md"
                >
                    <FaFilter className="text-emerald-400" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="badge badge-sm bg-emerald-500 text-white border-none">{activeFilterCount}</span>
                    )}
                </button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <m.div 
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <FaFilter className="text-emerald-400" />
                                    Filter Vehicles
                                </h3>
                                <div className="flex items-center gap-4">
                                    {activeFilterCount > 0 && (
                                        <button onClick={clearAll} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                                            Clear All
                                        </button>
                                    )}
                                    <button onClick={() => setIsExpanded(false)} className="btn btn-circle btn-sm btn-ghost text-slate-400 hover:text-white">
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {/* Vehicle Type */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Vehicle Type</label>
                                        {selectedTypes.length > 0 && (
                                            <button onClick={() => setSelectedTypes([])} className="text-xs text-emerald-400 hover:text-emerald-300">Clear</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {carTypes.map(type => (
                                            <button
                                                key={type.value}
                                                onClick={() => toggleType(type.value)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedTypes.includes(type.value) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Price Range</label>
                                        {priceRange && (
                                            <button onClick={() => setPriceRange(null)} className="text-xs text-emerald-400 hover:text-emerald-300">Clear</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'budget', label: 'Budget (< ₹3K)' },
                                            { id: 'mid', label: 'Mid (₹3K-₹8K)' },
                                            { id: 'premium', label: 'Premium (₹8K-₹15K)' },
                                            { id: 'ultra', label: 'Ultra (₹15K+)' }
                                        ].map(range => (
                                            <button
                                                key={range.id}
                                                onClick={() => setPriceRange(priceRange === range.id ? null : range.id)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${priceRange === range.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Seats & Transmission */}
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Seats</label>
                                            {selectedSeats && (
                                                <button onClick={() => setSelectedSeats(null)} className="text-xs text-emerald-400 hover:text-emerald-300">Clear</button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[2, 4, 5, 7].map(seats => (
                                                <button
                                                    key={seats}
                                                    onClick={() => setSelectedSeats(selectedSeats === seats ? null : seats)}
                                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedSeats === seats ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    {seats}{seats === 7 ? '+' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Transmission</label>
                                            {transmission && (
                                                <button onClick={() => setTransmission(null)} className="text-xs text-emerald-400 hover:text-emerald-300">Clear</button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['Automatic', 'Manual'].map(trans => (
                                                <button
                                                    key={trans}
                                                    onClick={() => setTransmission(transmission === trans ? null : trans)}
                                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${transmission === trans ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    {trans}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sort By */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Sort By</label>
                                        {sortBy && (
                                            <button onClick={() => setSortBy(null)} className="text-xs text-emerald-400 hover:text-emerald-300">Clear</button>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { id: 'price_asc', label: 'Price: Low to High' },
                                            { id: 'price_desc', label: 'Price: High to Low' },
                                            { id: 'newest', label: 'Newest First' }
                                        ].map(sort => (
                                            <button
                                                key={sort.id}
                                                onClick={() => setSortBy(sortBy === sort.id ? null : sort.id)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border text-left ${sortBy === sort.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {sort.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            <div className="flex items-center text-sm text-slate-400">
                <p>Showing <span className="text-white font-medium">{filteredCars.length}</span> of <span className="text-white font-medium">{cars.length}</span> vehicles</p>
            </div>

            {filteredCars.length > 0 ? (
                <div className='grow relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 flex-wrap gap-8 md:gap-6 justify-center items-center'>
                    {filteredCars.map((car, index) => (
                        <CarCard
                            key={`${car.id}-${index}`}
                            rentDaysCount={rentDaysCount}
                            href={`/customer/booking/step1?car=${encodeURIComponent(JSON.stringify(car))}&rentDate=${pickupData}&deliveryLocation=${deliveryLocation}`}
                            props={{...car}}
                        />
                    ))}
                </div>
            ) : (
                <div className="w-full py-16 flex flex-col items-center justify-center bg-slate-900/30 border border-white/5 rounded-3xl backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mb-4">
                        <FaFilter />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                    <p className="text-slate-400 text-center max-w-md mb-6">
                        We couldn&apos;t find any vehicles matching your current filter criteria. Try adjusting or clearing some filters.
                    </p>
                    <button onClick={clearAll} className="btn btn-primary px-8">
                        Clear All Filters
                    </button>
                </div>
            )}
        </section>
    );
}
