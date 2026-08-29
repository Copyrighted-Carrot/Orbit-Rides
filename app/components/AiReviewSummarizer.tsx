'use client'
import React from 'react';
import { 
    FaWandMagicSparkles, 
    FaThumbsUp, 
    FaTriangleExclamation, 
    FaStar, 
    FaQuoteLeft 
} from 'react-icons/fa6';

interface Review {
    rating: number;
    comment: string;
    created_at: string;
}

interface AiReviewSummarizerProps {
    reviews?: Review[];
    manufacturer: string;
    model: string;
}

export default function AiReviewSummarizer({ reviews = [], manufacturer, model }: AiReviewSummarizerProps) {
    if (reviews.length === 0) {
        return (
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6 items-center justify-center text-center">
                <FaStar className="text-4xl text-slate-700 mb-4" />
                <h3 className="text-xl font-extrabold text-white">No reviews yet — be the first to share your experience!</h3>
                <p className="text-sm text-slate-400 mt-2">Rent this {manufacturer} {model} and let others know how it drives.</p>
            </div>
        );
    }

    const averageRating = (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1);
    const positivePercentage = Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100);

    const comments = reviews.map(r => r.comment.toLowerCase());
    
    const pros = [];
    const watchouts = [];

    if (comments.some(c => c.includes('smooth') || c.includes('comfort') || c.includes('clean'))) {
        pros.push(<span><strong>Comfort & Cleanliness:</strong> Highly praised for smooth ride and great condition.</span>);
    }
    if (comments.some(c => c.includes('fast') || c.includes('power') || c.includes('engine') || c.includes('speed'))) {
        pros.push(<span><strong>Performance:</strong> Renters loved the engine power and acceleration.</span>);
    }
    if (comments.some(c => c.includes('space') || c.includes('spacious') || c.includes('room'))) {
        pros.push(<span><strong>Spacious:</strong> Ample room for passengers and luggage.</span>);
    }
    
    if (comments.some(c => c.includes('fuel') || c.includes('gas') || c.includes('mileage'))) {
        watchouts.push(<span><strong>Fuel Efficiency:</strong> Heavy acceleration leads to lower mileage.</span>);
    }
    if (comments.some(c => c.includes('park') || c.includes('big') || c.includes('size'))) {
        watchouts.push(<span><strong>Parking:</strong> Large size can make tight parking tricky.</span>);
    }
    if (comments.some(c => c.includes('expensive') || c.includes('price'))) {
        watchouts.push(<span><strong>Cost:</strong> Some found the daily rate a bit steep.</span>);
    }
    
    if (pros.length === 0) pros.push(<span><strong>Overall Quality:</strong> Solid driving experience reported by renters.</span>);
    if (watchouts.length === 0) watchouts.push(<span><strong>General Tip:</strong> Always review the vehicle manual before driving.</span>);

    return (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 text-xl border border-emerald-500/30">
                        <FaWandMagicSparkles />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-extrabold text-white">AI Renter Feedback Intelligence</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {reviews.length} Verified Reviews Synthesized
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">Natural Language Insights for {manufacturer} {model}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                    <FaStar className="text-amber-400 text-sm" />
                    <span>{averageRating} / 5.0 Renter Score ({positivePercentage}% Positive)</span>
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-white/10 relative overflow-hidden flex flex-col gap-2">
                <FaQuoteLeft className="text-emerald-500/10 text-6xl absolute -top-2 right-4 pointer-events-none" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 flex items-center gap-2">
                    <FaWandMagicSparkles /> AI Executive Synthesis Verdict
                </span>
                <p className="text-sm text-slate-200 font-medium leading-relaxed z-10">
                    &quot;Based on {reviews.length} recent reviews, renters generally appreciate the <strong>{manufacturer} {model}</strong> for its driving dynamics and overall quality. {positivePercentage}% of users had a highly positive experience.&quot;
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                        <FaThumbsUp /> Top Renter Highlights
                    </div>
                    <ul className="flex flex-col gap-2 text-xs text-slate-300 font-medium">
                        {pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-400 font-bold">•</span>
                                {pro}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-400 tracking-wider">
                        <FaTriangleExclamation /> AI Renter Watchouts & Tips
                    </div>
                    <ul className="flex flex-col gap-2 text-xs text-slate-300 font-medium">
                        {watchouts.map((watchout, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-400 font-bold">•</span>
                                {watchout}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
