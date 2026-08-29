'use client'
import {Car} from "@/lib/types/models";
import {Swiper, SwiperSlide} from "swiper/react";
import Link from "next/link";
import Image from 'next/image'
import 'swiper/css';
import {Autoplay} from 'swiper/modules';
import {RightArrowIcon} from "@/app/icons";

export default function HomePageFeaturedCarsCarousel({className = '', cars}: {
    className?: string,
    cars: Car[],
})
{
    return (
        <Swiper
            breakpoints={{
                1: {
                    slidesPerView: 1,
                    loop: cars.length > 1,
                    spaceBetween: 20
                },
                640: {
                    slidesPerView: 2,
                    loop: cars.length >= 2,
                    centerInsufficientSlides: cars.length <= 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    loop: cars.length > 3,
                    centerInsufficientSlides: cars.length <= 3,
                    spaceBetween: 10
                },
                1280: {
                    slidesPerView: 4,
                    loop: cars.length > 4,
                    centerInsufficientSlides: cars.length <= 4,
                    spaceBetween: 5
                },
            }}
            className={className}
            autoplay={{
                delay: 2500,
                disableOnInteraction: false,
            }}
            modules={[Autoplay]}
        >
            {cars.map((car, index) => (
                <SwiperSlide key={index} className="h-auto w-96">
                    <FeaturedCarCard props={{...car}}/>
                </SwiperSlide>
            ))}
        </Swiper>
    );
}

function FeaturedCarCard({props}: { props: Car })
{
    return (
        <Link href={'/customer'}
              className='group relative flex flex-col w-full h-80 rounded-3xl overflow-hidden border border-white/10 
              bg-slate-900/60 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-emerald-500/10 hover:border-emerald-500/40'>
            
            {/* Gradient Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10 opacity-90 group-hover:opacity-75 transition-opacity duration-500" />

            {/* Top Badges */}
            <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                    Featured Fleet
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-white border border-white/10 backdrop-blur-md">
                    ${props.price_per_day}<span className="text-emerald-400 text-[10px] uppercase font-semibold"> / day</span>
                </span>
            </div>

            {/* Hover Action Button */}
            <div className="absolute right-4 bottom-4 z-20 w-10 h-10 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-400">
                <RightArrowIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>

            {/* Bottom Content */}
            <div className="mt-auto p-6 z-20 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                    {props.manufacturer}
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                    {props.model}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                    <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        {props.seats} Seats
                    </span>
                    <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        {props.fuel === 1 ? 'Electric' : props.fuel === 2 ? 'Hybrid' : 'Gasoline'}
                    </span>
                </div>
            </div>

            {/* Background Image with Hover Zoom */}
            <Image
                fill
                loading='eager'
                unoptimized
                className='object-cover transition-transform duration-700 ease-out group-hover:scale-110'
                src={props.img_urls[0]}
                alt={`${props.manufacturer} ${props.model} image.`}/>
        </Link>
    );
}
