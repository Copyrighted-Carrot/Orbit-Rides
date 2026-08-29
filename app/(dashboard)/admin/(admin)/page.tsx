import {createClient} from "@/lib/supabase/server";
import Link from "next/link";
import Image, {StaticImageData} from 'next/image';
import carsCardImage from '@/public/images/admin-dashboard-cars-card.jpg';
import bookingsCardImage from '@/public/images/admin-dashboard-bookings-card.jpeg';

export const metadata = {
    title: 'Dashboard | Orbit Rides - Admin',
    description: 'Welcome to the Orbit Rides admin dashboard. Manage bookings, bookings, and more from a centralized hub.',
};

import AdminAnalyticsCharts from "@/app/components/AdminAnalyticsCharts";

export default async function AdminDashboard()
{
    const supabase = await createClient();

    const {count: carCount} = await supabase
        .from("cars")
        .select("*", {count: "exact", head: true});

    const {count: bookingCount} = await supabase
        .from("bookings")
        .select("*", {count: "exact", head: true});

    // Fetch totalRevenue: SUM of total_price from confirmed/completed/active bookings
    const { data: revenueData } = await supabase
        .from("bookings")
        .select("total_price")
        .in('status', ['confirmed', 'active', 'completed']);
    
    const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

    // Fetch recentBookings: last 5 bookings with car details
    const { data: recentBookingsData } = await supabase
        .from("bookings")
        .select("id, booking_ref, status, total_price, created_at, cars(manufacturer, model)")
        .order("created_at", { ascending: false })
        .limit(5);

    // map recentBookings properly
    const recentBookings = (recentBookingsData || []).map(b => ({
        id: b.id,
        booking_ref: b.booking_ref,
        status: b.status,
        total_price: b.total_price,
        created_at: b.created_at,
        car: Array.isArray(b.cars) ? b.cars[0] : (b.cars || {manufacturer: 'Unknown', model: 'Unknown'})
    })) as { id: number; booking_ref: string | null; status: string; total_price: number | null; created_at: string; car: { manufacturer: string; model: string } }[];

    // Fetch topVehicles: cars grouped by booking count (simulate if no group by)
    const { data: allBookings } = await supabase
        .from("bookings")
        .select("cars(manufacturer, model)");
    
    // Group them
    const carCounts: Record<string, {manufacturer: string, model: string, count: number}> = {};
    allBookings?.forEach(b => {
        if(b.cars) {
            const car = Array.isArray(b.cars) ? b.cars[0] : b.cars;
            if(!car) return;
            const key = `${car.manufacturer} ${car.model}`;
            if (!carCounts[key]) {
                carCounts[key] = { manufacturer: car.manufacturer, model: car.model, count: 0 };
            }
            carCounts[key].count += 1;
        }
    });

    const topVehicles = Object.values(carCounts).sort((a, b) => b.count - a.count).slice(0, 5);


    return (
        <div className="px-4 md:p-8 py-8 flex flex-col gap-10 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Executive Control Center</span>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Admin Analytics & Fleet Intelligence</h1>
            </div>

            {/* INTERACTIVE ANALYTICS CHARTS & METRICS */}
            <AdminAnalyticsCharts 
                carCount={carCount || 0} 
                bookingCount={bookingCount || 0} 
                totalRevenue={totalRevenue}
                recentBookings={recentBookings}
                topVehicles={topVehicles}
            />

            {/* QUICK MANAGEMENT SHORTCUTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center pt-4 border-t border-white/10">

                <ManageCard
                    linkHref="/admin/bookings/"
                    title="Manage Bookings"
                    description="View, filter, and manage all active customer bookings."
                    backgroundImage={bookingsCardImage}
                    color="accent"
                    count={bookingCount || 0}
                />

                <ManageCard
                    linkHref="/admin/cars/"
                    title="Manage Cars"
                    description="Add new supercars, update specs, or upload vehicle photos."
                    backgroundImage={carsCardImage}
                    color="primary"
                    count={carCount || 0}
                />
            </div>
        </div>
    );
}

function ManageCard({
                        linkHref,
                        title,
                        description,
                        backgroundImage,
                        color,
                        count,
                    }: {
    linkHref: string;
    title: string;
    description: string;
    backgroundImage: StaticImageData;
    color: string;
    count: number;
})
{
    return (
        <Link href={linkHref}>
            <div
                className={`card card-compact sm:card-normal h-[250px] md:h-[500px] image-full w-full max-w-96 shadow-xl transform hover:scale-105 transition-transform`}>
                <figure>
                    <Image
                        fill
                        className='w-full rounded-box'
                        src={backgroundImage}
                        alt={title}/>
                </figure>

                <div className={`card-body text-${color}-content`}>
                    <h2 className={`card-title text-${color}`}>{title}</h2>
                    <p>{description}</p>

                    <div className="card-actions items-center justify-end">
                        
                        <span className={` mr-auto`}>
                            <span className={`text-${color} font-bold text-lg`}>{count}</span> <span
                            className='font-normal text-content text-sm'> {title.split(' ')[1].toLowerCase()}
                            </span>
                        </span>

                        <button className={`btn btn-${color} text-sm`}>Manage</button>
                    </div>
                </div>
            </div>
        </Link>
    );
}