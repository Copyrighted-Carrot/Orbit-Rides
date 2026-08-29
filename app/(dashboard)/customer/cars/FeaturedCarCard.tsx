'use client'
import {Car} from "@/lib/types/models";
import {Swiper, SwiperSlide} from "swiper/react";
import Link from "next/link";
import Image from 'next/image'
import 'swiper/css';
import {Autoplay} from 'swiper/modules';
import {m} from 'framer-motion';
import {RightArrowIcon} from "@/app/icons";

const slideVariants = {
    hidden: {opacity: 0, y: 50},
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        // Delay based on index for staggered effect.
        transition: {delay: 0.65 + (index * 0.2), duration: 0.6, ease: 'easeOut'},
    })
};

export default function FeaturedCarsCarousel({className = '', cars, rentDate,deliveryLocation}: {
    className?: string,
    cars: Car[],
    rentDate: string,
    deliveryLocation: string,
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
                    <m.div
                        variants={slideVariants}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                    >
                        <FeaturedCarCard href={`/customer/booking/step1?car=${encodeURIComponent(JSON.stringify(car))}&rentDate=${rentDate}&deliveryLocation=${deliveryLocation}`}

                                         props={{...car}}/>
                    </m.div>
                </SwiperSlide>
            ))}
        </Swiper>
    );
}

function FeaturedCarCard({props, href}: { props: Car, href: string })
{
    return (
        <Link href={href}
              className='card card-compact rounded-3xl overflow-hidden 
              bg-transparent w-full h-44 relative group lg:scale-90'>
            
            <span
                className='p-3 px-5 bg-gradient-to-b from-black/80 via-black/60 to-transparent text-white'>
                <h3 className='card-title font-semibold'>
                    {props.manufacturer + ' ' + props.model}
                </h3>
        
                <h2 className='text-sm font-semibold'>
                    {'₹' + props.price_per_day.toLocaleString('en-IN')}/<span className='text-emerald-100 text-xs'>day</span>
                </h2>
            </span>

            <span
                className='btn btn-circle border-0 btn-sm absolute right-4 bottom-4 transition-[padding] group-hover:pl-2'><RightArrowIcon/></span>

            <span
                className="absolute top-4 right-4 rounded-full skeleton font-semibold text-xs py-1 px-2">Featured</span>

            <Image
                fill
                loading='eager'
                unoptimized
                className='-z-10 object-cover'
                src={props.img_urls[0]}
                alt={`${props.manufacturer} ${props.model} image.`}/>
        </Link>
    );
}
