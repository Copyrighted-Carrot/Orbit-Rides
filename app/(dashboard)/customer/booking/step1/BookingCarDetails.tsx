'use client'
import React, { useState } from "react";
import Image from "next/image";
import { Car } from "@/lib/types/models";
import { fuelTypes } from "@/lib/types/fuelTypes";
import Car360Viewer from "@/app/components/Car360Viewer";
import AvailabilityCalendar from "@/app/components/AvailabilityCalendar";
import AiReviewSummarizer from "@/app/components/AiReviewSummarizer";
import { 
    FaSliders, 
    FaCircleCheck, 
    FaMaximize 
} from "react-icons/fa6";

export default function BookingCarDetails({ 
    props, 
    avgRating = 0, 
    reviewCount = 0 
}: { 
    props: Car, 
    avgRating?: number, 
    reviewCount?: number 
}) {
    const images = props.img_urls && props.img_urls.length > 0 ? props.img_urls : ['/images/car-owners.jpg'];
    const [selectedImgIndex, setSelectedImgIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState<'All' | 'Exterior' | 'Interior' | 'Engine'>('All');
    const [activeSpecTab, setActiveSpecTab] = useState<'performance' | 'tech' | 'safety' | 'specs'>('performance');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const fuelLabel = fuelTypes[(props.fuel || 1) - 1]?.label || 'Gasoline';

    return (
        <div className="flex flex-col gap-10 w-full lg:w-3/5">
            {/* APPLE-STYLE GALLERY SHOWCASE */}
            <div className="flex flex-col gap-4 rounded-3xl p-4 sm:p-6 bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
                {/* Category Pills */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        {(['All', 'Exterior', 'Interior', 'Engine'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all ${
                                    activeCategory === cat
                                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span 
                            className="w-4 h-4 rounded-full border-2 border-white shadow" 
                            style={{ backgroundColor: props.color || '#000000' }} 
                            title="Vehicle Exterior Color" 
                        />
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            {props.manufacturer}
                        </span>
                    </div>
                </div>

                {/* Main Featured Image Display */}
                <div className="relative h-72 sm:h-[420px] w-full rounded-2xl overflow-hidden group shadow-inner">
                    <Image
                        src={images[selectedImgIndex]}
                        fill
                        alt={`${props.manufacturer} ${props.model}`}
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        priority
                    />
                    
                    {/* Dark Ambient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                    {/* Vehicle Title Overlay */}
                    <div className="absolute bottom-4 inset-x-4 flex justify-between items-end z-10">
                        <div>
                            <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400">
                                {props.manufacturer}
                            </span>
                            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                                {props.model}
                            </h1>
                        </div>

                        <button
                            onClick={() => setIsLightboxOpen(true)}
                            className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110"
                            title="Open Fullscreen Lightbox"
                        >
                            <FaMaximize className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {images.map((url, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedImgIndex(idx)}
                                className={`relative h-20 w-28 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                                    selectedImgIndex === idx
                                        ? 'border-emerald-400 scale-105 shadow-lg shadow-emerald-500/20'
                                        : 'border-white/10 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <Image src={url} fill alt="Thumbnail" className="object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* VEHICLE GALLERY */}
            <Car360Viewer images={images} manufacturer={props.manufacturer} model={props.model} />

            {/* PREMIUM AVAILABILITY CALENDAR */}
            <AvailabilityCalendar bookedDates={[]} />

            {/* APPLE-STYLE KEY SPECS HIGHLIGHT STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">0 - 60 mph</span>
                    <span className="text-2xl font-extrabold text-white">{props.zero_to_sixty ? props.zero_to_sixty + ' s' : 'N/A'}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">Launch</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">Power Output</span>
                    <span className="text-2xl font-extrabold text-white">{props.horsepower ? props.horsepower + ' HP' : 'N/A'}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">{props.engine_type || 'Engine'}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">Fuel Type</span>
                    <span className="text-2xl font-extrabold text-white">{fuelLabel}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">Energy</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 font-medium">Daily Rate</span>
                    <span className="text-2xl font-extrabold text-emerald-400">₹{props.price_per_day.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">All-Inclusive</span>
                </div>
            </div>

            {/* INTERACTIVE SPECIFICATIONS MATRIX */}
            <div className="flex flex-col gap-6 p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaSliders className="text-emerald-400" />
                        <span>Technical Specifications</span>
                    </h3>

                    {/* Spec Tabs */}
                    <div className="flex items-center gap-2">
                        {[
                            { id: 'performance', label: 'Engine' },
                            { id: 'tech', label: 'Technology' },
                            { id: 'safety', label: 'Safety' },
                            { id: 'specs', label: 'Capacity' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSpecTab(tab.id as 'performance' | 'tech' | 'safety' | 'specs')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeSpecTab === tab.id
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeSpecTab === 'performance' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <SpecRow label="Drivetrain" value={props.drivetrain || 'N/A'} />
                        <SpecRow label="Transmission" value={props.transmission || 'N/A'} />
                        <SpecRow label="Engine" value={props.engine_type || 'N/A'} />
                        <SpecRow label="Max Torque" value={props.torque || 'N/A'} />
                    </div>
                )}

                {activeSpecTab === 'tech' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <SpecRow label="Cockpit Display" value={props.features?.includes('Display') ? 'Premium Display' : 'Standard Display'} />
                        <SpecRow label="Audio System" value={props.features?.includes('Audio') ? 'Premium Audio' : 'Standard Audio'} />
                        <SpecRow label="Connectivity" value="Bluetooth & Smartphone Int." />
                        <SpecRow label="Keyless" value="Smart Entry" />
                    </div>
                )}

                {activeSpecTab === 'safety' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <SpecRow label="Driver Assist" value="Advanced System" />
                        <SpecRow label="Camera System" value="Rear/Surround Cameras" />
                        <SpecRow label="Collision Guard" value="Standard" />
                        <SpecRow label="Braking System" value="ABS/EBD" />
                    </div>
                )}

                {activeSpecTab === 'specs' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <SpecRow label="Seating Capacity" value={`${props.seats} Passengers`} />
                        <SpecRow label="Luggage Capacity" value={props.luggage_capacity ? props.luggage_capacity + ' L' : 'N/A'} />
                        <SpecRow label="Fuel Tank / Battery" value={props.fuel_capacity ? props.fuel_capacity + ' Gallons' : 'N/A'} />
                        <SpecRow label="Vehicle Category" value={props.type_display || 'Exotic Luxury'} />
                    </div>
                )}
            </div>

            {/* COMPARISON MODULE */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-white/10 backdrop-blur-xl flex flex-col gap-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FaCircleCheck className="text-emerald-400" />
                    <span>Orbit Rides Advantage</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase">Orbit Rides Luxury</span>
                        <ul className="text-xs text-slate-300 flex flex-col gap-1.5">
                            <li className="flex items-center gap-2">✓ 100% Guaranteed Exact Vehicle Model</li>
                            <li className="flex items-center gap-2">✓ Doorstep Key Delivery & Pick-up</li>
                            <li className="flex items-center gap-2">✓ Unlimited High-Speed Wi-Fi Included</li>
                        </ul>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Standard Car Rental</span>
                        <ul className="text-xs text-slate-500 flex flex-col gap-1.5">
                            <li>✗ &quot;Or Similar&quot; vehicle swaps at airport counter</li>
                            <li>✗ Long lines & mandatory upsell pressure</li>
                            <li>✗ Hidden fees & unpredictable cleaning surcharges</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* AI FEATURE 3: AI REVIEW SUMMARY & FEEDBACK INTELLIGENCE */}
            <AiReviewSummarizer manufacturer={props.manufacturer} model={props.model} />

            {/* VERIFIED RENTER REVIEWS & RATINGS */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col gap-6">
                {avgRating === 0 ? (
                    <div className="text-center text-slate-400 p-4">No ratings yet</div>
                ) : (
                    <>
                        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-extrabold text-white">{avgRating.toFixed(2)}</span>
                                    <div className="flex text-emerald-400 text-sm">
                                        {"★".repeat(Math.round(avgRating))}
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400">Based on {reviewCount} verified renter trips</span>
                            </div>

                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Highly Rated
                            </span>
                        </div>

                        {/* Score Meters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <RatingMeter label="Cleanliness & Detailing" score={avgRating.toFixed(1)} percent={`${(avgRating / 5) * 100}%`} />
                            <RatingMeter label="Performance & Maintenance" score={avgRating.toFixed(1)} percent={`${(avgRating / 5) * 100}%`} />
                            <RatingMeter label="Host Communication" score={avgRating.toFixed(1)} percent={`${(avgRating / 5) * 100}%`} />
                            <RatingMeter label="Pick-up Convenience" score={avgRating.toFixed(1)} percent={`${(avgRating / 5) * 100}%`} />
                        </div>
                    </>
                )}
            </div>

            {/* LIGHTBOX MODAL */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-6 right-6 text-white text-3xl font-bold hover:text-emerald-400 transition-colors z-50"
                    >
                        ✕
                    </button>
                    <div className="relative w-full max-w-5xl h-[80vh] rounded-3xl overflow-hidden">
                        <Image
                            src={images[selectedImgIndex]}
                            fill
                            alt="Lightbox Full view"
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function SpecRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 font-medium">{label}</span>
            <span className="text-white font-semibold text-right">{value}</span>
        </div>
    );
}

function RatingMeter({ label, score, percent }: { label: string; score: string; percent: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-slate-300 font-medium">
                <span>{label}</span>
                <span className="text-emerald-400 font-bold">{score}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: percent }} />
            </div>
        </div>
    );
}