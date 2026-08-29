import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";

export const metadata = {
    title: 'My Bookings | Orbit Rides',
    description: 'View and manage your upcoming and past car rentals.',
};

export default async function CustomerBookings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please log in to view your bookings.</div>;
    }

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            cars ( manufacturer, model, img_urls )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const cancelBooking = async (formData: FormData) => {
        "use server"
        const bookingId = formData.get('bookingId') as string;
        if (!bookingId) return;

        const supabase = await createClient();
        await supabase.from('bookings').update({ status: 'cancelled' as const }).eq('id', bookingId);
        revalidatePath('/customer/bookings');
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'completed': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const totalSpent = bookings?.reduce((sum, b) => sum + (b.total_price ?? 0), 0) || 0;
    const activeBookings = bookings?.filter(b => ['pending', 'confirmed', 'active'].includes(b.status)).length || 0;

    return (
        <div className="px-4 md:p-8 py-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
            <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Rental History</span>
                <h1 className="text-3xl font-black text-white tracking-tight">My Bookings</h1>
            </div>

            {/* Stats Bar */}
            {bookings && bookings.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-center">
                        <div className="text-2xl font-black text-white">{bookings.length}</div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">Total Bookings</div>
                    </div>
                    <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-400">₹{totalSpent.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">Amount Spent</div>
                    </div>
                    <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-center">
                        <div className="text-2xl font-black text-blue-400">{activeBookings}</div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">Active Bookings</div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">
                {(!bookings || bookings.length === 0) ? (
                    <div className="bg-slate-950 border border-white/10 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                        <span className="text-6xl mb-6">🏎️</span>
                        <h3 className="text-2xl font-bold text-white mb-3">No bookings yet — explore our fleet!</h3>
                        <p className="mb-6 max-w-md">You haven&apos;t made any reservations yet. Browse our collection of premium vehicles and book your next drive.</p>
                        <Link href="/customer/" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold transition-all">
                            Browse Cars
                        </Link>
                    </div>
                ) : (
                    bookings.map(b => {
                        const car = Array.isArray(b.cars) ? b.cars[0] : b.cars;
                        const carImage = (car?.img_urls && car.img_urls.length > 0) ? car.img_urls[0] : null;

                        return (
                            <div key={b.id} className="bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row group hover:border-emerald-500/30 transition-all">
                                {/* Image section */}
                                <div className="relative h-48 md:h-auto md:w-64 bg-slate-900 shrink-0">
                                    {carImage ? (
                                        <Image src={carImage} alt={`${car?.manufacturer} ${car?.model}`} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700 text-4xl font-black">
                                            {car?.manufacturer?.[0]}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Details section */}
                                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider ${getStatusBadge(b.status)} inline-block mb-2`}>
                                                {b.status}
                                            </span>
                                            <h3 className="text-xl font-bold text-white">{car ? `${car.manufacturer} ${car.model}` : 'Unknown Vehicle'}</h3>
                                            <div className="text-sm text-slate-400 font-mono mt-1">Ref: {b.booking_ref}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-emerald-400">{formatCurrency(b.total_price ?? 0)}</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-2xl p-4 flex gap-8">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Trip Dates</div>
                                            <div className="text-sm text-white font-medium">{b.date_range || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Pick-up Location</div>
                                            <div className="text-sm text-white font-medium">{b.pickup_location || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {(b.status === 'pending' || b.status === 'confirmed') && (
                                        <form action={cancelBooking} className="self-end mt-2">
                                            <input type="hidden" name="bookingId" value={b.id} />
                                            <button 
                                                type="submit" 
                                                className="text-red-400 hover:text-red-300 text-sm font-bold transition-colors"
                                                onClick={(e) => {
                                                    if(!confirm('Are you sure you want to cancel this booking?')) e.preventDefault();
                                                }}
                                            >
                                                Cancel Booking
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}