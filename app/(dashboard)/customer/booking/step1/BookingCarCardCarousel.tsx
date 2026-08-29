'use client'
import {Swiper, SwiperSlide} from "swiper/react";
import Image from 'next/image'
import 'swiper/css';
import 'swiper/css/navigation';
import {Autoplay,Navigation} from 'swiper/modules';

export default function BookingCarCardCarousel({className = '', imagesURLs}: {
    className?: string,
    imagesURLs: string[],
})
{
    return (
        <Swiper
            slidesPerView={1}
            loop={imagesURLs.length > 3}
            className={className}
            autoplay={{
                delay: 2500,
                disableOnInteraction: false,
            }}
            navigation
            modules={[Autoplay,Navigation]}
        >
            {imagesURLs.map((url, index) => (
                <SwiperSlide key={index} className="relative h-auto !w-full">
                    <Image
                        fill
                        unoptimized
                        src={url}
                        alt={`Car image.`}
                        className="object-cover"
                    />
                </SwiperSlide>
            ))}
        </Swiper>
    );
}