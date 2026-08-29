'use client'
import React, { useState, useRef } from "react";
import Image from "next/image";
import { 
    FaImage, 
    FaCircleDot,
    FaEye
} from "react-icons/fa6";

interface Car360ViewerProps {
    images: string[];
    manufacturer: string;
    model: string;
}

export default function Car360Viewer({ images, manufacturer, model }: Car360ViewerProps) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const frameCount = Math.max(images.length, 1);

    const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingRef.current = true;
        startXRef.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingRef.current || frameCount <= 1) return;
        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const diff = currentX - startXRef.current;
        if (Math.abs(diff) > 25) {
            const step = diff > 0 ? -1 : 1;
            setCurrentFrame((prev) => (prev + step + frameCount) % frameCount);
            startXRef.current = currentX;
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    const currentImg = images[currentFrame % images.length] || images[0] || '/images/car-owners.jpg';

    return (
        <div className="flex flex-col gap-4 p-6 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            {/* View Mode Navigation Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <FaImage className="text-emerald-400" />
                        <span>Vehicle Gallery</span>
                    </h3>
                </div>
            </div>

            {/* GALLERY VIEWER */}
            <div className="flex flex-col gap-3">
                <div
                    className="relative h-80 sm:h-[440px] w-full rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none bg-slate-900 border border-white/5"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                >
                    <Image
                        src={currentImg}
                        fill
                        alt={`${manufacturer} ${model} View`}
                        className="object-cover transition-transform duration-200 pointer-events-none"
                        priority
                    />

                    {frameCount > 1 && (
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-200 font-medium">
                            <span>Drag left/right to browse images</span>
                        </div>
                    )}

                    {/* Interactive Feature Hotspots */}
                    <button
                        onClick={() => setActiveHotspot('front')}
                        className="absolute top-1/3 left-1/3 z-20 w-8 h-8 rounded-full bg-emerald-500/80 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white animate-bounce"
                        title="Inspect Front"
                    >
                        <FaCircleDot className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setActiveHotspot('rear')}
                        className="absolute bottom-1/4 right-1/3 z-20 w-8 h-8 rounded-full bg-cyan-500/80 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white animate-pulse"
                        title="Inspect Rear"
                    >
                        <FaCircleDot className="w-3 h-3" />
                    </button>

                    {/* Frame Counter Badge */}
                    {frameCount > 1 && (
                        <div className="absolute bottom-4 right-4 z-10 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400">
                            Image {currentFrame + 1} of {frameCount}
                        </div>
                    )}
                </div>

                {/* Exterior Controls */}
                <div className="flex items-center justify-end flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <FaEye className="text-emerald-400" />
                        <span>Click Hotspots for Vehicle Details</span>
                    </div>
                </div>
            </div>

            {/* HOTSPOT DETAIL MODAL */}
            {activeHotspot && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 max-w-md w-full flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h4 className="text-lg font-bold text-white">
                                {activeHotspot === 'front' ? '⚡ Premium Front Fascia' : '🏎️ Dynamic Rear Styling'}
                            </h4>
                            <button onClick={() => setActiveHotspot(null)} className="text-slate-400 hover:text-white text-lg font-bold">
                                ✕
                            </button>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed font-light">
                            {activeHotspot === 'front'
                                ? `Engineered with high-precision aerodynamics and an aggressive stance for optimal performance.`
                                : `High-performance styling providing exceptional aerodynamic stability and visual appeal.`}
                        </p>

                        <button
                            onClick={() => setActiveHotspot(null)}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                        >
                            Close Callout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
