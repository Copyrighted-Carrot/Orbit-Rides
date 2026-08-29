'use client'
import {Car} from "@/lib/types/models";
import Link from "next/link";
import Image from "next/image";
import {fuelTypes} from "@/lib/types/fuelTypes";
import {RightArrowIcon} from "@/app/icons";
import { useWishlist } from "@/app/components/WishlistContext";
import { FaHeart } from "react-icons/fa6";

export default function CarCard({props, href, rentDaysCount}: {
    props: Car,
    href: string,
    rentDaysCount: number
})
{
    const fuelLabel = fuelTypes[(props.fuel || 1) - 1]?.label || 'Gasoline';
    const { toggleWishlist, isInWishlist } = useWishlist();
    const isFav = isInWishlist(props.id);

    const handleWishlistClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(props);
    };

    return (
        <Link
            className="group relative flex flex-col w-full rounded-3xl overflow-hidden border border-white/10 
            bg-slate-900/80 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-emerald-500/20 hover:border-emerald-500/40"
            href={href}>

            {/* Main Vehicle Image with Hover Zoom */}
            <div className="relative h-60 w-full overflow-hidden">
                <Image
                    fill
                    unoptimized
                    src={props.img_urls && props.img_urls.length > 0 ? props.img_urls[0] : '/images/car-owners.jpg'}
                    alt={`${props.manufacturer} ${props.model}`}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                
                {/* Gradient Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-10 opacity-90 group-hover:opacity-75 transition-opacity duration-500" />

                {/* Color Dot & Wishlist Heart Pill */}
                <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                        {props.type_display || 'Exotic'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleWishlistClick}
                            className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                                isFav
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                                    : 'bg-black/40 text-slate-300 border-white/20 hover:text-emerald-400 hover:scale-110'
                            }`}
                            title="Toggle Wishlist"
                        >
                            <FaHeart className="w-3.5 h-3.5" />
                        </button>
                        <span
                            className="w-5 h-5 rounded-full border-2 border-white shadow-md"
                            style={{backgroundColor: props.color || '#000000'}}
                            title="Vehicle Exterior Color"
                        />
                    </div>
                </div>

                {/* Price Pill Overlay */}
                <div className="absolute bottom-4 left-4 z-20 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white tracking-tight">₹{props.price_per_day.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-emerald-400 font-semibold uppercase">/ day</span>
                </div>
            </div>

            {/* Card Content Body */}
            <div className="p-6 flex flex-col gap-4 z-20">
                <div>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                        {props.manufacturer}
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                        {props.model}
                    </h3>
                </div>

                {/* Specs Pills */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 font-medium">
                    <div className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5">
                        {fuelLabel}
                    </div>
                    <div className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5">
                        {props.seats} Seats
                    </div>
                    <div className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5">
                        Automatic
                    </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-medium">Total ({rentDaysCount} {rentDaysCount === 1 ? 'day' : 'days'})</span>
                        <span className="text-lg font-extrabold text-emerald-400">₹{(props.price_per_day * rentDaysCount).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-400">
                        <RightArrowIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>
        </Link>
    );
}