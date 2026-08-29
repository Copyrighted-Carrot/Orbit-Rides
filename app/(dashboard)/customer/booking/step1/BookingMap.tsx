'use client'
import dynamic from "next/dynamic";

const Map = dynamic(() => import('@/app/components/Map'), {
    ssr: false,
    loading: () => <p className='font-bold'>Loading map...</p>,
});

export default function BookingMap({className = '', defaultLocation}: {
    className?: string,
    defaultLocation: { lat: number, lng: number }
})
{
    return (
        <div className={className}>
            <Map defaultLocation={defaultLocation}/>
        </div>
    );
}