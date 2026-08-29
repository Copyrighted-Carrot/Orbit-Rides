'use client'
import React, { useState } from 'react';
import { 
    FaWandMagicSparkles, 
    FaMapLocationDot, 
    FaCalendarDays, 
    FaUserGroup, 
    FaDollarSign, 
    FaCompass, 
    FaCarSide, 
    FaUtensils, 
    FaCamera,
    FaMountainSun,
    FaUmbrellaBeach,
    FaCity,
    FaTreeCity
} from 'react-icons/fa6';

interface ItineraryDay {
    day: number;
    title: string;
    morning: { time: string; activity: string; location: string };
    afternoon: { time: string; activity: string; location: string };
    evening: { time: string; activity: string; location: string };
}

// Activity templates by category that can be dynamically composed
const ACTIVITY_TEMPLATES = {
    beach: {
        icon: FaUmbrellaBeach,
        mornings: [
            { activity: 'Early morning beach walk & coastal drive along the highway', location: 'Coastal Road' },
            { activity: 'Beach sunrise yoga followed by a scenic highway drive', location: 'Beachfront' },
            { activity: 'Visit local fish market & drive to scenic beach viewpoints', location: 'Harbour Area' },
        ],
        afternoons: [
            { activity: 'Seafood lunch at a beachside restaurant with ocean views', location: 'Beach District' },
            { activity: 'Water sports & jet skiing followed by cliffside dining', location: 'Main Beach' },
            { activity: 'Explore historic coastal forts & Portuguese architecture', location: 'Heritage Quarter' },
        ],
        evenings: [
            { activity: 'Sunset cocktails at a beach shack & moonlit coastal cruise', location: 'Sunset Point' },
            { activity: 'Beach bonfire dinner with live music', location: 'Beach Club' },
            { activity: 'Night market exploration & street food tasting tour', location: 'Night Market' },
        ],
    },
    mountain: {
        icon: FaMountainSun,
        mornings: [
            { activity: 'Drive up scenic mountain switchbacks — enjoy panoramic valley views', location: 'Mountain Highway' },
            { activity: 'Visit botanical gardens & nature reserve', location: 'Nature Reserve' },
            { activity: 'Hike to a summit viewpoint for 360° mountain panoramas', location: 'Summit Trail' },
        ],
        afternoons: [
            { activity: 'Lunch at a hilltop restaurant overlooking tea/coffee estates', location: 'Estate Viewpoint' },
            { activity: 'Boating on a mountain lake surrounded by pine forests', location: 'Mountain Lake' },
            { activity: 'Visit local plantations — tea, coffee, or spice tasting tours', location: 'Plantation District' },
        ],
        evenings: [
            { activity: 'Fireside dinner at a heritage resort with mountain views', location: 'Heritage Lodge' },
            { activity: 'Stargazing at a clear mountain viewpoint — minimal light pollution', location: 'Hilltop Clearing' },
            { activity: 'Relaxing spa evening at a mountain wellness retreat', location: 'Wellness Resort' },
        ],
    },
    city: {
        icon: FaCity,
        mornings: [
            { activity: 'City landmarks driving tour — monuments, temples, & museums', location: 'City Center' },
            { activity: 'Visit historic district & architectural highlights', location: 'Old Town' },
            { activity: 'Morning drive to cultural centers & art galleries', location: 'Cultural District' },
        ],
        afternoons: [
            { activity: 'Fine dining at a top-rated restaurant followed by shopping', location: 'Commercial District' },
            { activity: 'Visit markets, boutiques, & local artisan workshops', location: 'Market Area' },
            { activity: 'Explore parks, gardens, & waterfront promenade', location: 'Waterfront' },
        ],
        evenings: [
            { activity: 'Rooftop dinner with city skyline views', location: 'Downtown Skyline' },
            { activity: 'Evening entertainment — live music, theatre, or nightlife', location: 'Entertainment District' },
            { activity: 'Night drive through illuminated city boulevards', location: 'City Lights Route' },
        ],
    },
    nature: {
        icon: FaTreeCity,
        mornings: [
            { activity: 'Dawn drive through forest roads to a wildlife sanctuary', location: 'Forest Reserve' },
            { activity: 'Visit waterfalls & natural swimming holes', location: 'Waterfall Trail' },
            { activity: 'Bird watching & nature photography at a forest viewpoint', location: 'Nature Viewpoint' },
        ],
        afternoons: [
            { activity: 'Picnic lunch at a riverside spot with scenic surroundings', location: 'Riverside Area' },
            { activity: 'Jungle trail hike followed by traditional village lunch', location: 'Village Trail' },
            { activity: 'Bamboo rafting or kayaking on a calm river', location: 'River Basin' },
        ],
        evenings: [
            { activity: 'Campfire dinner in an eco-lodge surrounded by nature', location: 'Eco Lodge' },
            { activity: 'Night safari or guided moonlit forest walk', location: 'Forest Camp' },
            { activity: 'Sunset viewpoint drive & farm-to-table dinner', location: 'Farm Stay' },
        ],
    },
};

// Detect trip category from destination name
function detectCategory(destination: string): keyof typeof ACTIVITY_TEMPLATES {
    const lower = destination.toLowerCase();
    const beachKeywords = ['goa', 'beach', 'coast', 'sea', 'ocean', 'kochi', 'pondicherry', 'andaman', 'lakshadweep', 'varkala', 'kovalam', 'marina', 'miami', 'bali', 'maldives', 'phuket'];
    const mountainKeywords = ['ooty', 'hill', 'mount', 'peak', 'munnar', 'coorg', 'kodaikanal', 'shimla', 'manali', 'darjeeling', 'mussoorie', 'nainital', 'lonavala', 'mahabaleshwar', 'alps', 'swiss'];
    const cityKeywords = ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 'jaipur', 'udaipur', 'mysore', 'london', 'paris', 'tokyo', 'new york', 'dubai'];

    if (beachKeywords.some(k => lower.includes(k))) return 'beach';
    if (mountainKeywords.some(k => lower.includes(k))) return 'mountain';
    if (cityKeywords.some(k => lower.includes(k))) return 'city';
    return 'nature'; // default for unknown destinations
}

// Generate dynamic itinerary titles
function generateDayTitle(category: string, dayNum: number, totalDays: number): string {
    const titles: Record<string, string[]> = {
        beach: ['Coastal Highway Run & Beach Arrival', 'Water Sports & Heritage Exploration', 'Island Hopping & Sunset Cruise', 'Beach Relaxation & Local Culture', 'Seafood Trail & Coastal Drive', 'Hidden Coves & Scenic Detours', 'Farewell Beach Day & Departure'],
        mountain: ['Scenic Mountain Ascent & Valley Views', 'Peak Exploration & Nature Trails', 'Plantation Tour & Lake Drive', 'Forest Excursion & Wildlife Watch', 'Village Heritage & Hot Springs', 'Summit Challenge & Panoramic Drive', 'Mountain Farewell & Descent'],
        city: ['City Landmarks & Cultural Immersion', 'Heritage Walk & Culinary Trail', 'Art, Museums & Shopping', 'Markets & Local Experiences', 'Parks & Waterfront Drive', 'Nightlife & Entertainment', 'Final Exploration & Departure'],
        nature: ['Forest Drive & Waterfall Discovery', 'Wildlife Safari & River Adventure', 'Bamboo Trails & Village Visit', 'Eco Exploration & Birdwatching', 'Hidden Gems & Nature Photography', 'Riverside Camping & Stargazing', 'Nature Farewell & Return'],
    };
    const options = titles[category] || titles.nature;
    if (dayNum === totalDays) return options[options.length - 1]; // Use farewell for last day
    return options[(dayNum - 1) % (options.length - 1)];
}

// Generate a complete itinerary dynamically
function generateItinerary(destination: string, days: number): ItineraryDay[] {
    const category = detectCategory(destination);
    const templates = ACTIVITY_TEMPLATES[category];
    const timeSlots = ['08:00 AM', '08:30 AM', '09:00 AM', '07:30 AM', '09:30 AM'];
    const afternoonSlots = ['01:00 PM', '01:30 PM', '02:00 PM', '12:30 PM', '02:30 PM'];
    const eveningSlots = ['06:00 PM', '06:30 PM', '07:00 PM', '05:30 PM', '07:30 PM'];

    const itinerary: ItineraryDay[] = [];

    for (let day = 1; day <= days; day++) {
        const morningIdx = (day - 1) % templates.mornings.length;
        const afternoonIdx = (day - 1) % templates.afternoons.length;
        const eveningIdx = (day - 1) % templates.evenings.length;

        // Customize activities based on context
        const morningActivity = templates.mornings[morningIdx];
        const afternoonActivity = templates.afternoons[afternoonIdx];
        const eveningActivity = templates.evenings[eveningIdx];

        itinerary.push({
            day,
            title: generateDayTitle(category, day, days),
            morning: {
                time: timeSlots[(day - 1) % timeSlots.length],
                activity: morningActivity.activity.replace(/your [A-Za-z ]+/i, `your rental vehicle`),
                location: `${destination} — ${morningActivity.location}`,
            },
            afternoon: {
                time: afternoonSlots[(day - 1) % afternoonSlots.length],
                activity: afternoonActivity.activity,
                location: `${destination} — ${afternoonActivity.location}`,
            },
            evening: {
                time: eveningSlots[(day - 1) % eveningSlots.length],
                activity: eveningActivity.activity,
                location: `${destination} — ${eveningActivity.location}`,
            },
        });
    }

    return itinerary;
}

export default function AiTripPlanner() {
    const [destination, setDestination] = useState('');
    const [daysCount, setDaysCount] = useState(3);
    const [peopleCount, setPeopleCount] = useState(2);
    const [budget, setBudget] = useState(5000);

    const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);

    const handleGenerateItinerary = () => {
        if (!destination.trim()) return;
        const result = generateItinerary(destination, daysCount);
        setItinerary(result);
    };

    const detectedCategory = destination ? detectCategory(destination) : null;

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">AI Experience Builder</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaWandMagicSparkles className="text-emerald-400" />
                        <span>Smart Trip & Driving Itinerary Planner</span>
                    </h3>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                    ✦ Supports Any Destination Worldwide
                </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Destination — Free text input */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaMapLocationDot className="text-emerald-400" /> Destination
                    </label>
                    <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter any city (e.g., Goa, Ooty, Paris...)"
                        className="bg-slate-950 text-white font-bold text-sm p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none placeholder:text-slate-500 placeholder:font-normal"
                    />
                    {detectedCategory && (
                        <span className="text-[10px] text-emerald-400 font-semibold capitalize">
                            Detected: {detectedCategory} trip
                        </span>
                    )}
                </div>

                {/* Days */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaCalendarDays className="text-emerald-400" /> Duration (Days)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="14"
                        value={daysCount}
                        onChange={(e) => setDaysCount(Math.max(1, Math.min(14, Number(e.target.value))))}
                        className="bg-slate-950 text-white font-bold text-sm p-2 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                    />
                </div>

                {/* Group Size */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaUserGroup className="text-emerald-400" /> Travelers
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(Number(e.target.value))}
                        className="bg-slate-950 text-white font-bold text-sm p-2 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                    />
                </div>

                {/* Budget */}
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                    <label className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-2">
                        <FaDollarSign className="text-emerald-400" /> Daily Budget
                    </label>
                    <select
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="bg-slate-950 text-white font-bold text-sm p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                    >
                        <option value={2000}>Economy (₹2,000/day)</option>
                        <option value={5000}>Comfort (₹5,000/day)</option>
                        <option value={10000}>Luxury (₹10,000/day)</option>
                        <option value={25000}>Ultra Premium (₹25,000/day)</option>
                    </select>
                </div>
            </div>

            {/* Popular destination chips */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400 font-medium mr-1">Popular:</span>
                {['Goa', 'Ooty', 'Manali', 'Jaipur', 'Coorg', 'Pondicherry', 'Dubai', 'Bali'].map(place => (
                    <button
                        key={place}
                        onClick={() => setDestination(place)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            destination === place 
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {place}
                    </button>
                ))}
            </div>

            {/* Action Trigger */}
            <button
                onClick={handleGenerateItinerary}
                disabled={!destination.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:scale-[1.01] text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FaCompass className="text-lg" /> Generate {destination || '...'} Trip Itinerary ★
            </button>

            {/* ITINERARY DISPLAY CARDS */}
            {itinerary && (
                <div className="flex flex-col gap-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h4 className="text-xl font-extrabold text-white">
                            Your {destination} Driving Experience ({daysCount} {daysCount === 1 ? 'Day' : 'Days'})
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                                {peopleCount} {peopleCount === 1 ? 'traveler' : 'travelers'} • ₹{budget.toLocaleString('en-IN')}/day budget
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {itinerary.map((dayPlan) => (
                            <div
                                key={dayPlan.day}
                                className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col gap-4 relative shadow-xl hover:border-emerald-500/30 transition-colors"
                            >
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 uppercase tracking-wider">
                                        Day {dayPlan.day}
                                    </span>
                                    <span className="text-xs font-bold text-white truncate max-w-[180px]" title={dayPlan.title}>
                                        {dayPlan.title}
                                    </span>
                                </div>

                                {/* Morning */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] text-emerald-400 font-extrabold uppercase flex items-center gap-1.5">
                                        <FaCarSide /> Morning ({dayPlan.morning.time})
                                    </span>
                                    <p className="text-xs text-white font-medium leading-relaxed">
                                        {dayPlan.morning.activity}
                                    </p>
                                    <span className="text-[10px] text-slate-400">📍 {dayPlan.morning.location}</span>
                                </div>

                                {/* Afternoon */}
                                <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                                    <span className="text-[11px] text-emerald-400 font-extrabold uppercase flex items-center gap-1.5">
                                        <FaUtensils /> Afternoon ({dayPlan.afternoon.time})
                                    </span>
                                    <p className="text-xs text-white font-medium leading-relaxed">
                                        {dayPlan.afternoon.activity}
                                    </p>
                                    <span className="text-[10px] text-slate-400">📍 {dayPlan.afternoon.location}</span>
                                </div>

                                {/* Evening */}
                                <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                                    <span className="text-[11px] text-emerald-400 font-extrabold uppercase flex items-center gap-1.5">
                                        <FaCamera /> Evening ({dayPlan.evening.time})
                                    </span>
                                    <p className="text-xs text-white font-medium leading-relaxed">
                                        {dayPlan.evening.activity}
                                    </p>
                                    <span className="text-[10px] text-slate-400">📍 {dayPlan.evening.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
