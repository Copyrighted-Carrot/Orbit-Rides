'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { createPaymentSession } from './action';
import { createClient } from '@/lib/supabase/client';
import { getDaysCountFromDateRange } from '@/lib/util/util';

export default function QRCheckoutContent({
    carJSON,
    rentDateJSON,
    deliveryLocationJSON
}: {
    carJSON: string;
    rentDateJSON: string;
    deliveryLocationJSON: string;
}) {
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'confirmed' | 'expired' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(15 * 60);

    const supabase = createClient();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    const car = JSON.parse(carJSON);
    const rentDate = JSON.parse(rentDateJSON);
    const rentDaysCount = getDaysCountFromDateRange(rentDate['pickup-date']);
    const totalPrice = car.price_per_day * rentDaysCount;

    // Stable callback for confirming
    const handleConfirmed = useCallback(() => {
        setStatus('confirmed');
    }, []);

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const initializeSession = async () => {
            setStatus('loading');
            const { session, error } = await createPaymentSession({
                car,
                totalPrice,
                rentDate: rentDateJSON,
                deliveryLocation: deliveryLocationJSON,
                rentDays: rentDaysCount
            });

            if (error || !session) {
                setStatus('error');
                setErrorMessage(error || 'Failed to create session');
                return;
            }

            setSessionId(session.id);
            setStatus('ready');

            // Countdown timer
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setStatus('expired');
                        clearInterval(timerRef.current!);
                        if (pollRef.current) clearInterval(pollRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Method 1: Supabase Realtime (instant, but may not always work)
            try {
                channel = supabase
                    .channel(`payment_${session.id}`)
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'payment_sessions',
                        filter: `id=eq.${session.id}`
                    }, (payload) => {
                        if (payload.new.status === 'confirmed') {
                            handleConfirmed();
                        }
                    })
                    .subscribe();
            } catch {
                // Realtime failed, polling will cover it
            }

            // Method 2: Polling fallback (every 3 seconds, guaranteed to work)
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch(`/api/payment/${session.id}/status`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'confirmed') {
                            handleConfirmed();
                        }
                    }
                } catch {
                    // Silently retry on next interval
                }
            }, 3000);
        };

        initializeSession();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            if (channel) supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Redirect after confirmed
    useEffect(() => {
        if (status === 'confirmed') {
            // Stop polling
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);

            setTimeout(() => {
                router.push(`/customer/booking/step3?car=${carJSON}&rentDate=${rentDateJSON}&deliveryLocation=${deliveryLocationJSON}&session_id=${sessionId}`);
            }, 2500);
        }
    }, [status, sessionId, router, carJSON, rentDateJSON, deliveryLocationJSON]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // QR URL: uses window.location.origin which is correct on Vercel (e.g. https://orbit-rides.vercel.app)
    // On localhost it'll be http://localhost:3000 — use the 'Complete on this device' button instead of scanning
    const confirmUrl = sessionId && typeof window !== 'undefined' ? `${window.location.origin}/payment/confirm/${sessionId}` : '';

    return (
        <div className="flex flex-col gap-10 py-10 px-4 md:px-8 lg:px-14 max-w-5xl mx-auto w-full">
            {/* Step Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <ul className="steps mx-auto w-full max-w-[800px] text-xs font-semibold">
                    <li className="step step-emerald text-emerald-400">Vehicle Details</li>
                    <li className="step step-emerald text-emerald-400">QR Payment</li>
                    <li className="step text-slate-400">Drive Away</li>
                </ul>
            </div>

            <div className="flex flex-col md:flex-row gap-8 bg-slate-900/80 border border-white/10 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl">

                {/* QR Code Section */}
                <div className="flex-1 flex flex-col items-center justify-center border-r-0 md:border-r border-white/10 pr-0 md:pr-8 pb-8 md:pb-0">
                    <h2 className="text-2xl font-extrabold text-white mb-6">Complete Payment</h2>

                    <div className="relative group">
                        {/* Glow effect */}
                        {status === 'ready' && (
                            <div className="absolute -inset-2 bg-emerald-500/20 rounded-[2rem] blur-xl animate-pulse"></div>
                        )}

                        <div className="relative bg-white p-6 rounded-3xl shadow-xl">
                            {status === 'loading' && (
                                <div className="w-[256px] h-[256px] flex flex-col items-center justify-center gap-4 text-slate-800">
                                    <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                    <span className="font-semibold text-center">Creating secure<br/>payment session...</span>
                                </div>
                            )}

                            {status === 'ready' && confirmUrl && (
                                <div className="relative overflow-hidden rounded-xl">
                                    <QRCodeSVG value={confirmUrl} size={256} level="H" />
                                    {/* Scanning line animation */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/50 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                </div>
                            )}

                            {status === 'confirmed' && (
                                <div className="w-[256px] h-[256px] flex flex-col items-center justify-center gap-6 text-slate-800">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center animate-[bounce_0.5s_ease-out]">
                                            <div className="w-12 h-6 border-b-4 border-l-4 border-emerald-500 -rotate-45 -mt-2"></div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-xl text-emerald-600 mb-2">Payment Verified ✓</p>
                                        <p className="text-sm text-slate-500">Redirecting to your booking...</p>
                                    </div>
                                </div>
                            )}

                            {status === 'expired' && (
                                <div className="w-[256px] h-[256px] flex flex-col items-center justify-center gap-4 text-slate-800">
                                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-3xl">!</div>
                                    <p className="font-bold">Session Expired</p>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="w-[256px] h-[256px] flex flex-col items-center justify-center gap-4 text-slate-800">
                                    <p className="text-red-500 text-center font-semibold">{errorMessage}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {status === 'ready' && (
                        <>
                            <div className="mt-8 flex items-center gap-2 text-slate-400 font-mono">
                                <span className="text-xl">⏱</span>
                                <span>Session expires in {formatTime(timeLeft)}</span>
                            </div>

                            {/* Complete on this device — fallback for when phone can't reach QR URL */}
                            <button
                                onClick={() => window.open(confirmUrl, '_blank')}
                                className="mt-4 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-white text-sm font-medium transition-all flex items-center gap-2"
                            >
                                <span className="text-lg">📱</span>
                                Complete on this device
                            </button>
                            <p className="text-[11px] text-slate-500 mt-1">Opens confirmation in a new tab</p>
                        </>
                    )}

                    {(status === 'expired' || status === 'error') && (
                        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                            Try Again
                        </button>
                    )}
                </div>

                {/* Booking Summary Section */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                        <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-2 block">How to Pay</span>

                        <div className="space-y-4 text-sm mt-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 border border-emerald-500/30 text-xs font-bold">A</div>
                                <p>Scan QR code with your phone camera</p>
                            </div>
                            <div className="text-center text-slate-500 text-xs font-semibold tracking-widest">— OR —</div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 border border-emerald-500/30 text-xs font-bold">B</div>
                                <p>Click &quot;Complete on this device&quot; below the QR</p>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <div className="w-8 h-8 rounded-full bg-emerald-800/50 flex items-center justify-center text-emerald-400 border border-emerald-500/30">✓</div>
                                <p>Booking confirms instantly — no refresh needed</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-white font-bold text-lg mb-4">Booking Summary</h3>
                            <div className="space-y-2 text-slate-300 text-sm">
                                <div className="flex justify-between">
                                    <span>Vehicle</span>
                                    <span className="text-white font-semibold">{car.manufacturer} {car.model}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Duration</span>
                                    <span className="text-white font-semibold">{rentDaysCount} {rentDaysCount === 1 ? 'day' : 'days'}</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span>Total Payable</span>
                                    <span className="text-2xl font-extrabold text-emerald-400">₹{totalPrice.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.back()}
                        className="mt-6 text-slate-400 hover:text-white text-sm font-medium transition-colors w-fit mx-auto"
                    >
                        ← Cancel &amp; Go Back
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}} />
        </div>
    );
}
