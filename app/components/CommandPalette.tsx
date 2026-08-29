'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    FaMagnifyingGlass, 
    FaXmark, 
    FaCar, 
    FaHeart, 
    FaKeyboard, 
    FaHouse, 
    FaCalendarCheck 
} from 'react-icons/fa6';
import { useWishlist } from './WishlistContext';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const router = useRouter();
    const { setIsDrawerOpen } = useWishlist();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            } else if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commands = [
        {
            id: 'cars',
            title: 'Browse Luxury Fleet',
            subtitle: 'Explore BMW, Porsche, Mercedes & Exotic Supercars',
            icon: <FaCar className="text-emerald-400" />,
            action: () => {
                router.push('/customer/cars');
                setIsOpen(false);
            },
        },
        {
            id: 'wishlist',
            title: 'Open Saved Wishlist',
            subtitle: 'View your favorited supercars and SUVs',
            icon: <FaHeart className="text-emerald-400" />,
            action: () => {
                setIsDrawerOpen(true);
                setIsOpen(false);
            },
        },
        {
            id: 'home',
            title: 'Return to Homepage',
            subtitle: 'Back to Orbit Rides main showcase',
            icon: <FaHouse className="text-emerald-400" />,
            action: () => {
                router.push('/');
                setIsOpen(false);
            },
        },
        {
            id: 'bookings',
            title: 'My Bookings & Trips',
            subtitle: 'Manage active reservations and rental history',
            icon: <FaCalendarCheck className="text-emerald-400" />,
            action: () => {
                router.push('/customer/bookings');
                setIsOpen(false);
            },
        },
    ];

    const filteredCommands = commands.filter((cmd) =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.subtitle.toLowerCase().includes(query.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4">
            <div className="w-full max-w-xl bg-slate-950 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-200">
                {/* Search Bar */}
                <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center gap-3">
                    <FaMagnifyingGlass className="text-emerald-400 text-lg ml-2" />
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a command or search (e.g. BMW, Wishlist, Bookings)..."
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 font-medium"
                    />
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-400 text-[10px] font-bold uppercase">
                        ESC
                    </span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <FaXmark className="w-4 h-4" />
                    </button>
                </div>

                {/* Command Items List */}
                <div className="p-3 max-h-80 overflow-y-auto flex flex-col gap-1">
                    {filteredCommands.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                            No matching commands found.
                        </div>
                    ) : (
                        filteredCommands.map((cmd) => (
                            <button
                                key={cmd.id}
                                onClick={cmd.action}
                                className="p-3 rounded-2xl flex items-center justify-between text-left hover:bg-white/5 transition-all group border border-transparent hover:border-emerald-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-lg group-hover:bg-emerald-500/20 transition-colors">
                                        {cmd.icon}
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                                            {cmd.title}
                                        </h4>
                                        <span className="text-xs text-slate-400">{cmd.subtitle}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500 group-hover:text-emerald-400 font-bold">↵ Select</span>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer Shortcuts Hint */}
                <div className="p-3 px-6 bg-slate-900/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                        <FaKeyboard className="text-emerald-400" />
                        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">?</kbd> to trigger palette</span>
                    </div>
                    <span>Orbit Rides v2.0</span>
                </div>
            </div>
        </div>
    );
}
