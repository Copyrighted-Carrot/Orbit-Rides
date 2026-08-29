'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-6 bg-base-200 p-8 rounded-2xl shadow-lg border border-base-300">
                    <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                        !
                    </div>
                    <h1 className="text-2xl font-bold text-base-content">Something went wrong!</h1>
                    <p className="text-sm text-base-content/70">
                        {error?.message || 'An unexpected application error occurred.'}
                    </p>
                    <div className="pt-2 flex gap-4 justify-center">
                        <button
                            onClick={() => reset()}
                            className="btn btn-primary px-6"
                        >
                            Try Again
                        </button>
                        <Link href="/" className="btn btn-ghost">
                            Go Home
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}
