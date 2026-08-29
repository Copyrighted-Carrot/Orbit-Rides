import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4 text-center bg-slate-950">
            <div className="relative">
                <h1 className="text-[150px] md:text-[200px] font-black text-white/5 leading-none select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">🛸</span>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <h2 className="text-3xl font-bold text-white">Lost in Orbit</h2>
                <p className="text-slate-400 max-w-md">
                    The page you&apos;re looking for has drifted into deep space. Let&apos;s get you back on track.
                </p>
            </div>
            <div className="flex gap-3">
                <Link href="/customer" className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl px-8">
                    Browse Cars
                </Link>
                <Link href="/" className="btn btn-outline border-white/20 text-white rounded-xl px-8">
                    Home
                </Link>
            </div>
        </div>
    );
}
