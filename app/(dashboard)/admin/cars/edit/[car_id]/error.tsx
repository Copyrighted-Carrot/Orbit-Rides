'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
            <p className="text-slate-400 max-w-md text-sm">
                We encountered an unexpected error. Please try again or go back.
            </p>
            <div className="flex gap-3">
                <button onClick={reset} className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-6">
                    Try Again
                </button>
                <Link href="/admin" className="btn btn-outline border-white/20 text-white rounded-xl px-6">
                    Admin Dashboard
                </Link>
            </div>
        </div>
    );
}
