'use client'
import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { 
    FaShieldHalved, 
    FaUpload, 
    FaCircleExclamation,
    FaCircleCheck,
    FaRotate
} from 'react-icons/fa6';

interface DamageAnnotation {
    id: number;
    x: number; // percentage
    y: number; // percentage
    label: string;
    severity: 'minor' | 'moderate' | 'severe';
}

export default function AiDamageDetector() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [annotations, setAnnotations] = useState<DamageAnnotation[]>([]);
    const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
    const [newAnnotationLabel, setNewAnnotationLabel] = useState('');
    const [newAnnotationSeverity, setNewAnnotationSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');
    const [pendingClick, setPendingClick] = useState<{x: number, y: number} | null>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAnnotations([]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageClick = (e: React.MouseEvent) => {
        if (!isAddingAnnotation || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPendingClick({ x, y });
    };

    const confirmAnnotation = () => {
        if (!pendingClick || !newAnnotationLabel.trim()) return;
        
        setAnnotations(prev => [
            ...prev,
            {
                id: Date.now(),
                x: pendingClick.x,
                y: pendingClick.y,
                label: newAnnotationLabel.trim(),
                severity: newAnnotationSeverity,
            }
        ]);
        setPendingClick(null);
        setNewAnnotationLabel('');
        setNewAnnotationSeverity('minor');
    };

    const removeAnnotation = (id: number) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
    };

    const clearAll = () => {
        setAnnotations([]);
        setPendingClick(null);
    };

    const overallScore = annotations.length === 0 
        ? 100 
        : Math.max(0, 100 - annotations.reduce((acc, a) => {
            if (a.severity === 'minor') return acc + 3;
            if (a.severity === 'moderate') return acc + 8;
            return acc + 15;
        }, 0));

    const severityColors = {
        minor: 'bg-yellow-500 border-yellow-400',
        moderate: 'bg-orange-500 border-orange-400',
        severe: 'bg-red-500 border-red-400',
    };

    return (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div>
                    <span className="text-xs uppercase font-semibold tracking-widest text-emerald-400">
                        Vehicle Inspection Tool
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <FaShieldHalved className="text-emerald-400" />
                        <span>Damage Documentation & Inspection</span>
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold">
                        📋 Manual Annotation Mode
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-white/10 text-[10px] font-bold uppercase">
                        DEMO
                    </span>
                </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                <p className="text-xs text-slate-300 leading-relaxed">
                    Upload a photo of the vehicle and click to mark any damage points. This tool helps document 
                    pre-existing damage during pickup and return inspections. 
                    <span className="text-amber-400 font-semibold"> Note: This is a manual annotation tool — 
                    automated AI damage detection would require a trained computer vision model.</span>
                </p>
            </div>

            {/* Upload Area */}
            {!uploadedImage ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed border-white/20 hover:border-emerald-500/50 cursor-pointer transition-colors bg-slate-900/40"
                >
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
                        <FaUpload className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-white">Upload Vehicle Photo</p>
                        <p className="text-xs text-slate-400 mt-1">Click to browse — JPG, PNG, WebP supported</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>
            ) : (
                <>
                    {/* Image with Annotations */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        isAddingAnnotation
                                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                                            : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {isAddingAnnotation ? '✦ Click Image to Mark Damage' : '+ Add Damage Point'}
                                </button>
                                {annotations.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setUploadedImage(null);
                                    setAnnotations([]);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 hover:text-white transition-all flex items-center gap-1.5"
                            >
                                <FaRotate className="w-3 h-3" /> New Photo
                            </button>
                        </div>

                        <div 
                            ref={imageRef}
                            className={`relative w-full h-[400px] rounded-2xl overflow-hidden border-2 ${
                                isAddingAnnotation ? 'border-emerald-500/50 cursor-crosshair' : 'border-white/10'
                            } transition-colors`}
                            onClick={handleImageClick}
                        >
                            <Image
                                src={uploadedImage}
                                fill
                                alt="Vehicle for inspection"
                                className="object-cover"
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />

                            {/* Rendered Annotations */}
                            {annotations.map((point) => (
                                <button
                                    key={point.id}
                                    className={`absolute w-6 h-6 rounded-full ${severityColors[point.severity]} border-2 
                                        flex items-center justify-center text-white text-[9px] font-black 
                                        shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform z-20`}
                                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeAnnotation(point.id);
                                    }}
                                    title={`${point.label} (${point.severity}) — Click to remove`}
                                >
                                    !
                                </button>
                            ))}

                            {/* Pending click marker */}
                            {pendingClick && (
                                <div
                                    className="absolute w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-500/30 animate-pulse 
                                        transform -translate-x-1/2 -translate-y-1/2 z-30"
                                    style={{ left: `${pendingClick.x}%`, top: `${pendingClick.y}%` }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Annotation Form (when a click is pending) */}
                    {pendingClick && (
                        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-end gap-3">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-xs text-slate-400 font-semibold">Damage Description</label>
                                <input
                                    type="text"
                                    value={newAnnotationLabel}
                                    onChange={(e) => setNewAnnotationLabel(e.target.value)}
                                    placeholder="e.g., Front bumper scratch"
                                    className="bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 font-semibold">Severity</label>
                                <select
                                    value={newAnnotationSeverity}
                                    onChange={(e) => setNewAnnotationSeverity(e.target.value as 'minor' | 'moderate' | 'severe')}
                                    className="bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none"
                                >
                                    <option value="minor">Minor</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={confirmAnnotation}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
                                >
                                    Add Point
                                </button>
                                <button
                                    onClick={() => setPendingClick(null)}
                                    className="px-3 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold border border-white/10 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Inspection Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase">Health Score</span>
                            <span className={`text-3xl font-extrabold ${
                                overallScore >= 90 ? 'text-emerald-400' : 
                                overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {overallScore.toFixed(1)} / 100
                            </span>
                            <span className="text-[10px] text-slate-400">Based on {annotations.length} noted point{annotations.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase">Damage Points</span>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                                    {annotations.filter(a => a.severity === 'minor').length} minor
                                </span>
                                <span className="flex items-center gap-1 text-orange-400 font-bold">
                                    {annotations.filter(a => a.severity === 'moderate').length} moderate
                                </span>
                                <span className="flex items-center gap-1 text-red-400 font-bold">
                                    {annotations.filter(a => a.severity === 'severe').length} severe
                                </span>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase">Status</span>
                            {annotations.length === 0 ? (
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <FaCircleCheck />
                                    <span className="text-sm font-bold">No damage documented</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-amber-400">
                                    <FaCircleExclamation />
                                    <span className="text-sm font-bold">Damage documented</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Annotation List */}
                    {annotations.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <h4 className="text-sm font-bold text-white">Documented Damage Points</h4>
                            {annotations.map((point, idx) => (
                                <div key={point.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-3 h-3 rounded-full ${severityColors[point.severity]}`} />
                                        <span className="text-xs text-white font-semibold">#{idx + 1} — {point.label}</span>
                                        <span className="text-[10px] text-slate-400 capitalize">({point.severity})</span>
                                    </div>
                                    <button
                                        onClick={() => removeAnnotation(point.id)}
                                        className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
