'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    FaRobot, 
    FaXmark, 
    FaPaperPlane, 
    FaWandMagicSparkles, 
    FaArrowRight 
} from 'react-icons/fa6';
import { Car } from '@/lib/types/models';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    recommendedCars?: Car[];
}

export default function AiFleetAssistant({ availableCars = [] }: { availableCars: Car[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        {
            sender: 'ai',
            text: "Hello! I'm Orbit AI, your luxury mobility concierge. Tell me about your upcoming journey — where are you traveling, with whom, and what vibe are you looking for?",
        },
    ]);

    const quickPrompts = [
        "Need a spacious SUV for 5 friends to the mountains.",
        "Looking for an affordable sedan for a business trip.",
        "Premium sports car for a weekend getaway.",
    ];

    const generateAiResponse = (userText: string) => {
        setIsTyping(true);

        setTimeout(() => {
            const lower = userText.toLowerCase();
            let neededSeats = 2;
            const numbers = userText.match(/\d+/);
            if (numbers) {
                neededSeats = parseInt(numbers[0], 10);
            } else if (lower.includes('friends') || lower.includes('people') || lower.includes('passengers') || lower.includes('family')) {
                neededSeats = 4;
            }

            let tripType = '';
            if (lower.includes('business')) tripType = 'sedan';
            else if (lower.includes('romantic')) tripType = 'sports';
            else if (lower.includes('adventure') || lower.includes('family') || lower.includes('mountain')) tripType = 'suv';

            let budget = 'any';
            if (lower.includes('cheap') || lower.includes('affordable')) budget = 'low';
            else if (lower.includes('luxury') || lower.includes('premium')) budget = 'high';

            // Recommend cars based on criteria
            let matches = availableCars.filter(car => car.seats >= neededSeats);

            if (tripType) {
                const typeMatches = matches.filter(car => (car.type_display || '').toLowerCase().includes(tripType));
                if (typeMatches.length > 0) matches = typeMatches;
            }

            if (budget === 'low') {
                matches = matches.sort((a, b) => a.price_per_day - b.price_per_day);
            } else if (budget === 'high') {
                matches = matches.sort((a, b) => b.price_per_day - a.price_per_day);
            }

            let aiText = '';
            let recommendedCars: Car[] = [];

            if (matches.length > 0) {
                recommendedCars = matches.slice(0, 2);
                aiText = `Based on your request, I found some excellent options that fit your needs.`;
            } else {
                aiText = "Could you tell me a bit more? How many passengers are traveling, and what type of trip is it?";
            }

            setMessages((prev) => [
                ...prev,
                {
                    sender: 'ai',
                    text: aiText,
                    recommendedCars: recommendedCars.length > 0 ? recommendedCars : undefined,
                },
            ]);
            setIsTyping(false);
        }, 800);
    };

    const handleSend = (textToSend?: string) => {
        const text = textToSend || input;
        if (!text.trim()) return;

        setMessages((prev) => [...prev, { sender: 'user', text }]);
        if (!textToSend) setInput('');
        generateAiResponse(text);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-transform flex items-center gap-3 border border-emerald-300/40 group"
                title="Launch Orbit AI Concierge"
            >
                <FaRobot className="w-6 h-6 animate-pulse" />
                <span className="hidden md:inline font-black text-xs uppercase tracking-wider pr-1">
                    Ask Orbit AI
                </span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-slate-950 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[620px] relative">
                        <div className="p-4 px-6 bg-slate-900 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-lg">
                                    <FaRobot />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-base">Orbit AI Concierge</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Smart Match
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">Contextual Vehicle Match Engine</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <FaXmark className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col gap-2 max-w-[85%] ${
                                        msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                                    }`}
                                >
                                    <div
                                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none'
                                                : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none shadow-md'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>

                                    {msg.recommendedCars?.map((car, cIdx) => (
                                        <div key={cIdx} className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex flex-col gap-3 backdrop-blur-md shadow-xl mt-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-16 w-20 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                                                    {car.img_urls?.[0] && (
                                                        <Image
                                                            src={car.img_urls[0]}
                                                            fill
                                                            alt={`${car.manufacturer} ${car.model}`}
                                                            className="object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                                                        AI Top Pick
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-white truncate">
                                                        {car.manufacturer} {car.model}
                                                    </h4>
                                                    <span className="text-xs font-bold text-emerald-400">
                                                        ₹{car.price_per_day?.toLocaleString('en-IN')} / day
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-300 font-light leading-snug">
                                                {car.type_display || 'Vehicle'} with {car.seats} seats.
                                            </p>

                                            <Link
                                                href={`/customer/booking/step1?carId=${car.id}`}
                                                onClick={() => setIsOpen(false)}
                                                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <span>Reserve Vehicle Now</span>
                                                <FaArrowRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {isTyping && (
                                <div className="mr-auto p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-slate-400 text-xs flex items-center gap-2">
                                    <FaWandMagicSparkles className="text-emerald-400 animate-spin" />
                                    <span>Orbit AI is thinking...</span>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-2 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
                            {quickPrompts.map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(prompt)}
                                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-[11px] font-semibold whitespace-nowrap border border-white/10 transition-colors shrink-0"
                                >
                                    ✨ {prompt}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Describe your trip (e.g. Goa with 4 friends)..."
                                className="flex-1 bg-slate-950 text-white text-xs p-3 rounded-xl border border-white/10 focus:border-emerald-400 focus:outline-none placeholder:text-slate-500"
                            />
                            <button
                                onClick={() => handleSend()}
                                className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md"
                            >
                                <FaPaperPlane className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
