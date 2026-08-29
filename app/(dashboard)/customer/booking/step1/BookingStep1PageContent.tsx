'use client'
import {Car} from "@/lib/types/models";
import BookingCarDetails from "@/app/(dashboard)/customer/booking/step1/BookingCarDetails";
import {FormEvent, ReactNode, useState} from "react";
import {getDaysCountFromDateRange} from "@/lib/util/util";
import BookingMap from "@/app/(dashboard)/customer/booking/step1/BookingMap";
import {FaCalendarDays, FaDownLong, FaMapLocation, FaUpLong} from "react-icons/fa6";
import {rentTimes} from "@/lib/types/rentTimes";
import {MoonLoader} from "react-spinners";

type BookingInfoType = {
    car: Car,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rentDate: any,
    deliveryLocation: { lat: number; lng: number; }
}

export default function BookingStep1PageContent({car, rentDate, deliveryLocation}: BookingInfoType)
{
    const rentDaysCount = getDaysCountFromDateRange(rentDate['pickup-date']);
    const pickupDates = rentDate['pickup-date'].split('-');
    const pickupTime = rentTimes.find(time => time.value == rentDate['pickup-time'])?.label;

    const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false)

    const handleCheckout = async (e: FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        setIsRedirectingToStripe(true);
        
        // Build step 2 URL with same params
        const params = window.location.href.split('?')[1];
        window.location.href = `/customer/booking/step2?${params}`;
    };

    return (
        <div className="flex flex-col gap-10 py-10 px-4 md:px-8 lg:px-14 max-w-7xl mx-auto w-full">

            {/* Apple-Style Step Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <ul className="steps mx-auto w-full max-w-[800px] text-xs font-semibold">
                    <li className="step step-emerald text-emerald-400">Vehicle Details</li>
                    <li className="step text-slate-400">QR Payment</li>
                    <li className="step text-slate-400">Drive Away</li>
                </ul>
            </div>

            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-10">
                <BookingCarDetails props={car}/>

                {/* Booking Details Pane */}
                <div className="flex flex-col gap-6 lg:w-2/5 h-auto bg-slate-900/80 border border-white/10 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl sticky top-24">
                    <div className="border-b border-white/10 pb-4">
                        <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Reservation Summary</span>
                        <h2 className='text-2xl font-extrabold text-white mt-1'>Booking Details</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                        <BookingItem title={'Rent Duration'} icon={<FaCalendarDays className='text-emerald-400'/>}>
                            {rentDaysCount} {rentDaysCount === 1 ? 'day' : 'days'}
                        </BookingItem>

                        <BookingItem title={'Pick-up Date & Time'} icon={<FaDownLong className='text-emerald-400'/>}>
                            {pickupDates[0]} at {pickupTime}
                        </BookingItem>

                        <BookingItem title={'Drop-off Date & Time'} icon={<FaUpLong className='text-emerald-400'/>}>
                            {pickupDates[1]} at {pickupTime}
                        </BookingItem>

                        <BookingItem title={'Delivery Location'} icon={<FaMapLocation className='text-emerald-400'/>}/>
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-md">
                            <BookingMap className='w-full h-48' defaultLocation={deliveryLocation}/>
                        </div>
                    </div>

                    {/* Pricing Calculation Breakdown */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between text-slate-300">
                            <span>Daily Rate (₹{car.price_per_day.toLocaleString('en-IN')} × {rentDaysCount} days)</span>
                            <span>₹{(car.price_per_day * rentDaysCount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Insurance & 24/7 Roadside VIP</span>
                            <span className="text-emerald-400 font-semibold">Included</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between items-center text-base font-bold text-white">
                            <span>Total Payable</span>
                            <span className="text-2xl font-extrabold text-emerald-400">₹{(car.price_per_day * rentDaysCount).toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <form onSubmit={handleCheckout} id='checkoutForm'>
                        <button
                            disabled={isRedirectingToStripe}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isRedirectingToStripe ?
                                <><MoonLoader size='20' color='#020617'/> Processing Payment...</> :
                                <span>Confirm & Pay →</span>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function BookingItem({title, icon, children}: { title: string, icon: ReactNode, children?: ReactNode })
{
    return (
        <span className="flex flex-col gap-1">
            <span className='flex items-center text-slate-400 text-xs font-semibold gap-2 uppercase tracking-wider'>{icon} {title}</span>
            {children && <span className='font-bold text-base text-white'>{children}</span>}
        </span>
    );
}