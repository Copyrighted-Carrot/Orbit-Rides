'use client'
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from './WishlistContext';
import { FaHeart, FaTrash, FaXmark, FaArrowRight } from 'react-icons/fa6';

export default function WishlistDrawer() {
    const { wishlist, removeFromWishlist, isDrawerOpen, setIsDrawerOpen } = useWishlist();

    if (!isDrawerOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md transition-opacity">
            <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-slate-950 border-l border-white/10 p-6 flex flex-col gap-6 shadow-2xl text-slate-100 relative">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <FaHeart className="text-emerald-400 text-lg" />
                            <h2 className="text-xl font-bold text-white">Your Saved Fleet</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {wishlist.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsDrawerOpen(false)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <FaXmark className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                        {wishlist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center my-auto text-center gap-4 text-slate-400">
                                <div className="p-4 rounded-full bg-white/5 border border-white/10 text-3xl text-emerald-400">
                                    <FaHeart />
                                </div>
                                <h3 className="text-lg font-bold text-white">Your Wishlist is Empty</h3>
                                <p className="text-xs max-w-xs text-slate-400">
                                    Save your favorite luxury supercars and SUVs by clicking the heart icon on any vehicle card.
                                </p>
                            </div>
                        ) : (
                            wishlist.map((car) => (
                                <div
                                    key={car.id}
                                    className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md relative group hover:border-emerald-500/30 transition-all"
                                >
                                    <div className="relative h-20 w-24 rounded-xl overflow-hidden shrink-0">
                                        <Image
                                            src={car.img_urls && car.img_urls.length > 0 ? car.img_urls[0] : '/images/car-owners.jpg'}
                                            fill
                                            alt={`${car.manufacturer} ${car.model}`}
                                            className="object-cover"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
                                            {car.manufacturer}
                                        </span>
                                        <h4 className="text-sm font-bold text-white truncate">
                                            {car.model}
                                        </h4>
                                        <span className="text-sm font-extrabold text-emerald-400">
                                            ₹{car.price_per_day.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal"> / day</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href="/customer"
                                            onClick={() => setIsDrawerOpen(false)}
                                            className="p-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                                            title="Book Now"
                                        >
                                            <FaArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => removeFromWishlist(car.id)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                            title="Remove"
                                        >
                                            <FaTrash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {wishlist.length > 0 && (
                        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                            <Link
                                href="/customer"
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm text-center shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                            >
                                Explore & Rent Saved Fleet
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
