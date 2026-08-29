'use client';
import React, { useState, useRef } from 'react';
import { Car } from '@/lib/types/models';

// Top 80 Indian cities for autocomplete
const INDIA_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
    'Jaipur', 'Lucknow', 'Surat', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
    'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
    'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad',
    'Amritsar', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior',
    'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Chandigarh', 'Guwahati',
    'Thiruvananthapuram', 'Solapur', 'Hubli', 'Tiruchirappalli', 'Bareilly', 'Mysore',
    'Gurgaon', 'Noida', 'Dehradun', 'Shimla', 'Manali', 'Udaipur', 'Rishikesh',
    'Kochi', 'Mangalore', 'Ooty', 'Pondicherry', 'Goa', 'Darjeeling', 'Munnar',
    'Kodaikanal', 'Jaisalmer', 'Pushkar', 'Mount Abu', 'Lonavala', 'Mahabaleshwar',
    'Hampi', 'Alleppey', 'Wayanad', 'Coorg', 'Leh', 'Ladakh', 'McLeod Ganj', 
    'Nainital', 'Mussoorie', 'Gangtok',
];

interface TripPlan {
    route: { totalDistanceKm: number; estimatedDriveTimeHours: number; overview: string };
    costs: { fuelCostEstimate: number; tollEstimate: number; rentalCost: number; foodEstimate: number; totalEstimate: number };
    segments: { from: string; to: string; distanceKm: number; driveTimeHours: number; highlights: string }[];
    stops: {
        fuel: { name: string; location: string; type: string }[];
        food: { name: string; location: string; cuisine: string; priceRange: string }[];
        tolls: { name: string; highway: string; estimatedCost: number }[];
        rest: { name: string; location: string; type: string }[];
    };
    dailyPlan: { day: number; title: string; driveKm: number; activities: string[] }[];
    weather: string;
    tips: string[];
}

function CityInput({ value, onChange, placeholder, label }: {
    value: string; onChange: (v: string) => void; placeholder: string; label: string;
}) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (val: string) => {
        onChange(val);
        if (val.length >= 2) {
            const filtered = INDIA_CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative flex-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">{label}</label>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => handleChange(e.target.value)}
                onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
            />
            {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                    {suggestions.map(city => (
                        <button
                            key={city}
                            type="button"
                            className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                            onClick={() => { onChange(city); setShowSuggestions(false); }}
                        >
                            <span className="text-emerald-400">📍</span> {city}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OrbitTripPlanner({ cars }: { cars: Car[] }) {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [waypoints, setWaypoints] = useState<string[]>([]);
    const [newWaypoint, setNewWaypoint] = useState('');
    const [selectedCarId, setSelectedCarId] = useState<number | ''>('');
    const [tripDays, setTripDays] = useState(3);
    const [plan, setPlan] = useState<TripPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'route' | 'stops' | 'daily'>('overview');

    const selectedCar = cars.find(c => c.id === selectedCarId);

    const addWaypoint = () => {
        if (newWaypoint.trim() && waypoints.length < 5) {
            setWaypoints(prev => [...prev, newWaypoint.trim()]);
            setNewWaypoint('');
        }
    };

    const removeWaypoint = (index: number) => {
        setWaypoints(prev => prev.filter((_, i) => i !== index));
    };

    const generatePlan = async () => {
        if (!origin || !destination) { setError('Please enter origin and destination'); return; }
        setLoading(true);
        setError('');
        setPlan(null);

        try {
            const res = await fetch('/api/ai/trip-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin,
                    destination,
                    waypoints,
                    tripDays,
                    car: selectedCar ? {
                        manufacturer: selectedCar.manufacturer,
                        model: selectedCar.model,
                        fuelType: selectedCar.type_display || 'Petrol',
                        mileage: 15,
                        price_per_day: selectedCar.price_per_day,
                    } : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate plan');
            }

            const data = await res.json();
            setPlan(data);
            setActiveTab('overview');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">🗺️</div>
                <div>
                    <h2 className="text-xl font-extrabold text-white">Orbit Trip Planner</h2>
                    <p className="text-xs text-slate-400">AI-powered route planning with real cost estimates</p>
                </div>
            </div>

            {/* Input Form */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <CityInput value={origin} onChange={setOrigin} placeholder="e.g. Chennai" label="Origin City" />
                    <div className="hidden md:flex items-end pb-3 text-slate-500">→</div>
                    <CityInput value={destination} onChange={setDestination} placeholder="e.g. Kerala" label="Destination" />
                </div>

                {/* Waypoints */}
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
                        Add Stops Along the Way <span className="text-slate-500">({waypoints.length}/5)</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newWaypoint}
                            onChange={e => setNewWaypoint(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWaypoint())}
                            placeholder="e.g. Relative&apos;s house in Madurai"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                            disabled={waypoints.length >= 5}
                        />
                        <button
                            onClick={addWaypoint}
                            disabled={!newWaypoint.trim() || waypoints.length >= 5}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-emerald-400 font-bold text-sm disabled:opacity-30 transition-colors"
                        >
                            + Add
                        </button>
                    </div>
                    {waypoints.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {waypoints.map((wp, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                                    📍 {wp}
                                    <button onClick={() => removeWaypoint(i)} className="text-emerald-400 hover:text-red-400 ml-1">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    {/* Car Selection */}
                    <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Vehicle (for cost estimate)</label>
                        <select
                            value={selectedCarId}
                            onChange={e => setSelectedCarId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-slate-800">No specific car</option>
                            {cars.map(car => (
                                <option key={car.id} value={car.id} className="bg-slate-800">
                                    {car.manufacturer} {car.model} — ₹{car.price_per_day}/day
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Trip Duration */}
                    <div className="w-full md:w-48">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Trip Days</label>
                        <input
                            type="number"
                            min={1}
                            max={30}
                            value={tripDays}
                            onChange={e => setTripDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:outline-none"
                        />
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                <button
                    onClick={generatePlan}
                    disabled={loading || !origin || !destination}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> Generating Trip Plan...</>
                    ) : (
                        <>✨ Generate AI Trip Plan</>
                    )}
                </button>
            </div>

            {/* Results */}
            {plan && (
                <div className="border-t border-white/10 pt-6 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                        {(['overview', 'route', 'stops', 'daily'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === tab
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab === 'overview' && '📊 '}
                                {tab === 'route' && '🛣️ '}
                                {tab === 'stops' && '📍 '}
                                {tab === 'daily' && '📅 '}
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <p className="text-slate-300 text-sm">{plan.route.overview}</p>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-white">{plan.route.totalDistanceKm.toLocaleString()}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Total KM</div>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-white">{plan.route.estimatedDriveTimeHours.toFixed(1)}h</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Drive Time</div>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-emerald-400">₹{plan.costs.totalEstimate.toLocaleString('en-IN')}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Total Cost</div>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-white">{tripDays}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Days</div>
                                </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                                <h3 className="text-sm font-bold text-white mb-3">💰 Cost Breakdown</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-300">
                                        <span>⛽ Fuel</span>
                                        <span className="font-semibold text-white">₹{plan.costs.fuelCostEstimate.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span>🚧 Tolls</span>
                                        <span className="font-semibold text-white">₹{plan.costs.tollEstimate.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span>🚗 Rental ({tripDays} days)</span>
                                        <span className="font-semibold text-white">₹{plan.costs.rentalCost.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span>🍽️ Food</span>
                                        <span className="font-semibold text-white">₹{plan.costs.foodEstimate.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 mt-2 border-t border-white/10">
                                        <span className="font-bold text-white">Grand Total</span>
                                        <span className="font-black text-emerald-400 text-lg">₹{plan.costs.totalEstimate.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Weather */}
                            {plan.weather && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm flex items-start gap-2">
                                    <span>🌤️</span>
                                    <span>{plan.weather}</span>
                                </div>
                            )}

                            {/* Tips */}
                            {plan.tips && plan.tips.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <h3 className="text-sm font-bold text-amber-300 mb-2">💡 Travel Tips</h3>
                                    <ul className="space-y-1">
                                        {plan.tips.map((tip, i) => (
                                            <li key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                                                <span className="text-amber-400 mt-0.5">•</span>
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Route Tab */}
                    {activeTab === 'route' && (
                        <div className="space-y-3">
                            {plan.segments.map((seg, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            i === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        {i < plan.segments.length - 1 && (
                                            <div className="w-px h-12 bg-white/10 my-1"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{seg.from} → {seg.to}</h4>
                                                <p className="text-xs text-slate-400 mt-1">{seg.highlights}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <div className="text-sm font-bold text-emerald-400">{seg.distanceKm} km</div>
                                                <div className="text-xs text-slate-400">{seg.driveTimeHours.toFixed(1)}h drive</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stops Tab */}
                    {activeTab === 'stops' && (
                        <div className="space-y-5">
                            {/* Fuel Stops */}
                            {plan.stops.fuel?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">⛽ Fuel / Charging Stops</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {plan.stops.fuel.map((s, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm shrink-0">
                                                    {s.type === 'ev_charging' ? '🔌' : '⛽'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-white text-sm truncate">{s.name}</div>
                                                    <div className="text-xs text-slate-400">{s.location}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Food Stops */}
                            {plan.stops.food?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">🍽️ Food & Restaurants</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {plan.stops.food.map((s, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm shrink-0">🍛</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-white text-sm truncate">{s.name}</div>
                                                    <div className="text-xs text-slate-400">{s.cuisine} • {s.priceRange}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tolls */}
                            {plan.stops.tolls?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">🚧 Toll Plazas</h3>
                                    <div className="space-y-2">
                                        {plan.stops.tolls.map((t, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                                <div>
                                                    <div className="font-semibold text-white text-sm">{t.name}</div>
                                                    <div className="text-xs text-slate-400">{t.highway}</div>
                                                </div>
                                                <div className="text-emerald-400 font-bold text-sm">₹{t.estimatedCost}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rest Stops */}
                            {plan.stops.rest?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">🏨 Rest Stops</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {plan.stops.rest.map((s, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm shrink-0">🏨</div>
                                                <div>
                                                    <div className="font-semibold text-white text-sm">{s.name}</div>
                                                    <div className="text-xs text-slate-400">{s.location}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Daily Plan Tab */}
                    {activeTab === 'daily' && (
                        <div className="space-y-4">
                            {plan.dailyPlan.map((day) => (
                                <div key={day.day} className="bg-white/5 border border-white/5 rounded-xl p-5">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                                                D{day.day}
                                            </div>
                                            <h4 className="font-bold text-white">{day.title}</h4>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">{day.driveKm} km</span>
                                    </div>
                                    <ul className="space-y-2 ml-[52px]">
                                        {day.activities.map((act, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                <span className="text-emerald-400 mt-0.5">▸</span>
                                                <span>{act}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
