import {Car} from "@/lib/types/models";
import Link from "next/link";
import FeaturedCarsCarousel from "@/app/(dashboard)/customer/cars/FeaturedCarCard";
import {createClient} from "@/lib/supabase/server";
import CarFilters from "@/app/(dashboard)/customer/cars/CarFilters";
import {redirect} from "next/navigation";
import {getDaysCountFromDateRange} from "@/lib/util/util";

export const metadata = {
    title: 'Browse Cars | Orbit Rides',
    description: 'Explore our extensive selection of cars for rent. Find your perfect ride for any occasion.',
};

import OrbitTripPlanner from "@/app/components/OrbitTripPlanner";
import CarComparator from "@/app/components/CarComparator";
import PersonalizedHeader from "@/app/components/PersonalizedHeader";
import AiDamageDetector from "@/app/components/AiDamageDetector";
import AiFleetAssistant from "@/app/components/AiFleetAssistant";

export default async function CustomerCarsPage({searchParams}: {
    searchParams: Promise<{ pickupData: string, deliveryLocation: string }>
})
{
    const {pickupData, deliveryLocation} = await searchParams;
    if (!pickupData || !deliveryLocation) redirect('/customer/');

    const pickupDataJson = JSON.parse(pickupData)
    const rentDays = getDaysCountFromDateRange(pickupDataJson['pickup-date']);

    const supabase = await createClient();

    // Fetch current user
    const {data: {user}} = await supabase.auth.getUser();

    // Fetch user profile for personalized header
    let userName: string | null = null;
    if (user) {
        const {data: profile} = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
        userName = profile?.display_name || user.user_metadata?.display_name || user.email || null;
    }

    // Fetch recently viewed vehicles for this user
    let recentlyViewed: Array<{name: string, price: number, image: string, type: string, carId: number}> = [];
    if (user) {
        const {data: recentData} = await supabase
            .from('recently_viewed')
            .select('car_id, cars(id, manufacturer, model, price_per_day, img_urls, type_id)')
            .eq('user_id', user.id)
            .order('viewed_at', {ascending: false})
            .limit(4);
        
        if (recentData) {
            recentlyViewed = recentData
                .filter((rv: Record<string, unknown>) => rv.cars)
                .map((rv: Record<string, unknown>) => {
                    const car = rv.cars as Record<string, unknown>;
                    const imgUrls = car.img_urls as string[] | null;
                    return {
                        name: `${car.manufacturer} ${car.model}`,
                        price: car.price_per_day as number,
                        image: imgUrls && imgUrls.length > 0 ? imgUrls[0] : '/images/car-owners.jpg',
                        type: 'Vehicle',
                        carId: car.id as number,
                    };
                });
        }
    }

    // Fetch pending bookings for unfinished booking bar
    let pendingBooking: {destination: string, dateRange: string, carId: number} | null = null;
    if (user) {
        const {data: pendingData} = await supabase
            .from('bookings')
            .select('car_id, date_range, pickup_location')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', {ascending: false})
            .limit(1)
            .single();
        
        if (pendingData) {
            pendingBooking = {
                destination: pendingData.pickup_location || 'Unknown',
                dateRange: pendingData.date_range || '',
                carId: pendingData.car_id,
            };
        }
    }

    // Fetch available cars (exclude archived, with fallback if column is missing)
    let carsData: Car[] | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let carsError: { message?: string } | null = null;

    const carsResult = await supabase
        .from('cars')
        .select('*')
        .not('img_urls', 'is', null)
        .neq('is_archived', true)
        .order('price_per_day', {ascending: false});

    if (carsResult.error) {
        // Fallback if is_archived column does not exist on the table yet
        if (carsResult.error.message?.includes('is_archived') || carsResult.error.code === '42703') {
            const fallbackResult = await supabase
                .from('cars')
                .select('*')
                .not('img_urls', 'is', null)
                .order('price_per_day', {ascending: false});
            carsData = fallbackResult.data as Car[] | null;
            carsError = fallbackResult.error;
        } else {
            carsError = carsResult.error;
        }
    } else {
        carsData = carsResult.data as Car[] | null;
    }

    const {data: typesData, error: typesError} = await supabase
        .from("car_types")
        .select();

    if (carsError) throw new Error(carsError.message);
    if (typesError) throw new Error(typesError.message || 'Failed to load car types');

    const carTypes = (typesData || []).map((carType) => ({
        value: carType.id,
        label: carType.type
    }));

    const cars: Car[] = (carsData || []) as Car[];

    // Populate the type_display for each car.
    cars.forEach(car =>
    {
        const carType = carTypes.find(type => type.value === car.type_id);
        if (carType) car.type_display = carType.label;
    });

    const featuredCars = cars.filter(car => car.price_per_day > 60);
    const regularCars = cars.filter(car => !featuredCars.includes(car));

    if (!cars || cars.length <= 0) return (
        <div className='flex flex-col justify-center items-center gap-6 h-full min-h-[60vh] p-8 text-center'>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl">
                🚗
            </div>
            <div className="space-y-2">
                <h2 className='text-xl font-bold text-white'>No Vehicles Found</h2>
                <p className="text-sm text-slate-400 max-w-sm">
                    We couldn&apos;t find any rental cars matching your location and dates. Try searching with a different region or dates.
                </p>
            </div>
            <Link href={'/customer/'} className='btn btn-primary px-8'>Try Another Location</Link>
        </div>
    );

    return (
        <div className='flex flex-col gap-12 py-10 pb-16 px-4 md:px-8 lg:px-14 max-w-7xl mx-auto w-full'>

            {/* PERSONALIZED USER GREETING & RECENTLY VIEWED STRIP — now with real data */}
            <PersonalizedHeader 
                userName={userName}
                recentlyViewed={recentlyViewed}
                pendingBooking={pendingBooking}
            />

            <FeaturedCarsCarousel
                className={'w-full h-auto mt-8 md:bg-slate-900/80 border border-white/10 md:rounded-3xl md:shadow-2xl md:!p-6 backdrop-blur-2xl'}
                rentDate={pickupData}
                deliveryLocation={deliveryLocation}
                cars={featuredCars}/>

            {/* UNIFIED AI TRIP PLANNER — replaces cost calculator + trip planner + recommender */}
            <OrbitTripPlanner cars={cars} />

            {/* DAMAGE DOCUMENTATION TOOL */}
            <AiDamageDetector />

            {/* VISUAL SIDE-BY-SIDE CAR COMPARATOR */}
            <CarComparator cars={cars} />

            <CarFilters 
                cars={regularCars}
                rentDaysCount={rentDays}
                pickupData={pickupData}
                deliveryLocation={deliveryLocation}
                carTypes={carTypes}
            />

            {/* FLOATING AI FLEET ASSISTANT — now with real car data */}
            <AiFleetAssistant availableCars={cars} />
        </div>
    );
}

