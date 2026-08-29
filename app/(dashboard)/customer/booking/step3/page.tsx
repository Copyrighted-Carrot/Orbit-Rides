import Image from "next/image";
import {redirect} from "next/navigation";
import {Car} from "@/lib/types/models";
import {rentTimes} from "@/lib/types/rentTimes";
import {createClient} from "@/lib/supabase/server";
import Link from "next/link";
import {getDaysCountFromDateRange, generateBookingRef} from "@/lib/util/util";
import {checkCarAvailability} from "@/lib/util/availability";
import {DownloadButton} from "./DownloadButton";

export const metadata = {
    title: 'Booking Complete | Orbit Rides',
    description: 'Your booking is confirmed! View your booking details and get ready for your rental.',
};

type searchParamsType = {
    searchParams: Promise<{
        car: string;
        rentDate: string;
        deliveryLocation: string;
        session_id: string;
    }>;
};

export default async function BookingStep3({searchParams}: searchParamsType)
{
    const {
        car: carJSON,
        rentDate: rentDateJSON,
        deliveryLocation: deliveryLocationJSON,
        session_id
    } = await searchParams;

    if (!carJSON || !rentDateJSON || !deliveryLocationJSON || !session_id) redirect("/customer/");

    const car = JSON.parse(decodeURIComponent(carJSON)) as Car;
    const rentDate = JSON.parse(rentDateJSON);
    const deliveryLocation = JSON.parse(deliveryLocationJSON);

    const pickupDates = rentDate["pickup-date"].split("-");
    const pickupTime = rentTimes.find((time) => time.value == rentDate["pickup-time"])?.label;

    const rentDaysCount = getDaysCountFromDateRange(rentDate["pickup-date"]);
    const totalPrice = car.price_per_day * rentDaysCount;

    // Save booking details to Supabase
    const bookingRef = await saveBookingDetails({
        carId: car.id!,
        pickupDate: rentDate["pickup-date"],
        pickupTime: rentDate["pickup-time"],
        deliveryLocation: deliveryLocation,
        checkoutId: session_id,
        totalPrice: totalPrice,
        pickupTimeFormatted: pickupTime || '',
        dropoffTime: pickupTime || ''
    });

    return (
        <div className="flex flex-col items-center gap-8 py-10 px-4 md:px-8 lg:px-14 min-h-screen">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-receipt, #print-receipt * {
                        visibility: visible;
                    }
                    #print-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        color: black;
                        box-shadow: none;
                    }
                    .hide-on-print {
                        display: none !important;
                    }
                }
            `}</style>

            <ul className="steps mx-auto w-full max-w-[1000px] hide-on-print mb-8">
                <li className="step step-primary">Details</li>
                <li className="step step-primary">Payment</li>
                <li className="step step-primary">Done!</li>
            </ul>

            <div id="print-receipt" className="w-full max-w-3xl bg-slate-900/80 border border-white/10 backdrop-blur rounded-xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                {/* Emerald Accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Booking Receipt</h1>
                        <p className="text-emerald-400 font-mono text-lg">{bookingRef}</p>
                    </div>
                    <div className="text-left md:text-right">
                        <p className="text-slate-400 text-sm">Booked On</p>
                        <p className="text-white font-medium">{new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-6">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Vehicle</p>
                            <h3 className="text-xl font-semibold text-white">{car.manufacturer} {car.model}</h3>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Trip Dates</p>
                            <p className="text-white font-medium">{pickupDates[0].trim()} - {pickupDates[1].trim()}</p>
                            <p className="text-slate-300 text-sm mt-1">{rentDaysCount} days</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Pickup Information</p>
                            <p className="text-white font-medium">{pickupTime}</p>
                            <p className="text-slate-300 text-sm mt-1">{deliveryLocation}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center md:justify-end">
                        <div className="relative w-full max-w-[280px] aspect-[16/10] rounded-lg overflow-hidden border border-white/10">
                            <Image 
                                src={car.img_urls[0]} 
                                alt={`${car.manufacturer} {car.model}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-300">Daily Rate</span>
                        <span className="text-white">{(car.price_per_day).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-300">Duration</span>
                        <span className="text-white">{rentDaysCount} days</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-y border-white/10">
                        <span className="text-xl font-bold text-white">Total Amount</span>
                        <span className="text-2xl font-bold text-emerald-400">
                            {totalPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-slate-300">Payment Status</span>
                        <span className="flex items-center gap-2 text-emerald-400 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Confirmed
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-end hide-on-print">
                    <DownloadButton />
                    <Link href="/customer/bookings" className="btn btn-outline border-white/20 hover:bg-white/10 text-white">
                        View My Bookings
                    </Link>
                    <Link href="/customer/" className="btn btn-primary bg-emerald-500 hover:bg-emerald-600 border-none text-white">
                        Book Another Car
                    </Link>
                </div>
            </div>
        </div>
    );
}

async function saveBookingDetails(bookingDetails: {
    carId: number;
    pickupDate: string;
    pickupTime: string;
    deliveryLocation: string;
    checkoutId: string;
    totalPrice: number;
    pickupTimeFormatted: string;
    dropoffTime: string;
})
{
    const { available } = await checkCarAvailability(bookingDetails.carId, bookingDetails.pickupDate);
    if (!available) {
        redirect('/customer/?error=This vehicle is no longer available for your selected dates');
    }

    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    
    const bookingRef = generateBookingRef();

    const {error} = await supabase.schema('public')
        .from("bookings").insert({
            car_id: bookingDetails.carId,
            checkout_id: bookingDetails.checkoutId,
            date_range: bookingDetails.pickupDate,
            pickup_time: parseInt(bookingDetails.pickupTime),
            pickup_location: bookingDetails.deliveryLocation,
            user_id: user!.id,
            total_price: bookingDetails.totalPrice,
            pickup_time_formatted: bookingDetails.pickupTimeFormatted,
            dropoff_time: bookingDetails.dropoffTime,
            status: 'confirmed',
            booking_ref: bookingRef,
        });

    if (error && error.code !== '23505')
    {
        console.error("Error saving booking to Supabase:", error);
        throw new Error("Could not save booking details. Please try again.");
    }
    
    if (error && error.code === '23505') {
        const { data: existing } = await supabase.from('bookings').select('booking_ref').eq('checkout_id', bookingDetails.checkoutId).single();
        if (existing && existing.booking_ref) return existing.booking_ref;
    }
    
    return bookingRef;
}