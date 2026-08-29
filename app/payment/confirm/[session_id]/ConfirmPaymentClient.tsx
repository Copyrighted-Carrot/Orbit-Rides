'use client';

import { useEffect, useState } from 'react';

interface ConfirmData {
    status: string;
    carName: string;
    amount: number;
}

const messages = [
    { emoji: '🚀', title: 'Orbit Payment Complete', subtitle: 'Your cosmic journey begins now. The stars are aligning for your ride.' },
    { emoji: '🌟', title: 'Transaction Locked In', subtitle: 'Gravity couldn\'t stop this booking. You\'re cleared for takeoff.' },
    { emoji: '🛸', title: 'Orbit Thanks You', subtitle: 'Your ride is fueled and ready. The road awaits, explorer.' },
    { emoji: '✨', title: 'Payment Confirmed', subtitle: 'You just launched the most premium booking in the galaxy.' },
    { emoji: '🌍', title: 'Mission Accomplished', subtitle: 'Houston, we have a booking. Buckle up for an extraordinary ride.' },
    { emoji: '💫', title: 'Orbit Has You Covered', subtitle: 'From here to the horizon, your luxury ride awaits.' },
];

export default function ConfirmPaymentClient({ sessionId }: { sessionId: string }) {
    const [state, setState] = useState<'loading' | 'confirmed' | 'already' | 'error'>('loading');
    const [data, setData] = useState<ConfirmData | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const index = sessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % messages.length;
    const msg = messages[index];

    useEffect(() => {
        const confirmPayment = async () => {
            try {
                const res = await fetch(`/api/payment/${sessionId}/status`, {
                    method: 'POST',
                });
                const json = await res.json();

                if (!res.ok) {
                    setErrorMsg(json.error || 'Something went wrong');
                    setState('error');
                    return;
                }

                if (json.status === 'already_confirmed') {
                    setState('already');
                    setData(json);
                } else {
                    setState('confirmed');
                    setData(json);
                }
            } catch {
                setErrorMsg('Network error. Please check your connection.');
                setState('error');
            }
        };

        confirmPayment();
    }, [sessionId]);

    if (state === 'loading') {
        return (
            <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-medium">Verifying payment...</p>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold text-red-400 mb-2">Payment Failed</h1>
                <p className="text-slate-400 max-w-sm">{errorMsg}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }, (_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4],
                            left: `${(i * 5.26) % 100}%`,
                            top: '-5%',
                            animation: `fall ${2 + (i % 3)}s linear infinite`,
                            animationDelay: `${(i * 0.25)}s`
                        }}
                    ></div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .gradient-text {
                    background: linear-gradient(to right, #10b981, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}} />

            <div className="z-10 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center">
                <div className="text-7xl mb-6 animate-bounce">{msg.emoji}</div>
                <h1 className="text-3xl font-extrabold gradient-text mb-3">{msg.title}</h1>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">{msg.subtitle}</p>

                {state === 'already' && (
                    <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-amber-300 text-xs font-medium">
                        This payment was already confirmed previously.
                    </div>
                )}

                <div className="w-full bg-black/40 rounded-xl p-5 mb-8 border border-white/5">
                    <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-slate-400">Vehicle</span>
                        <span className="font-semibold text-white">{data?.carName || 'Your Vehicle'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Amount Paid</span>
                        <span className="font-bold text-emerald-400 text-lg">₹{(data?.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-sm mb-8">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</div>
                    <span>Your booking is being confirmed on desktop</span>
                </div>

                <p className="text-xs text-slate-500 mb-6 font-medium">You can now close this tab and return to your computer.</p>

                <div className="flex items-center gap-2 opacity-50">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                    <span className="font-bold tracking-widest text-xs uppercase">Orbit Rides</span>
                </div>
            </div>
        </div>
    );
}
