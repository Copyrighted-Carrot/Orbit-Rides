import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export const metadata = {
    title: 'Manage Bookings | Orbit Rides - Admin',
    description: 'View and manage all customer bookings within the Orbit Rides admin panel.',
};

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await searchParams;
    const statusFilter = resolvedParams.status || 'all';

    let query = supabase
        .from('bookings')
        .select(`
            *,
            cars ( manufacturer, model, img_urls ),
            user_profiles ( display_name )
        `)
        .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: bookings } = await query;

    const updateStatus = async (formData: FormData) => {
        "use server"
        const bookingId = formData.get('bookingId') as string;
        const status = formData.get('status') as string;
        
        if (!bookingId || !status) return;

        const supabase = await createClient();
        await supabase.from('bookings').update({ status: status as 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' }).eq('id', bookingId);
        revalidatePath('/admin/bookings');
    };

    const getStatusColor = (status: string) => {
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

    const tabs = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];

    return (
        <div className="px-4 md:p-8 py-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Booking Management</span>
                    <h1 className="text-3xl font-black text-white tracking-tight">All Bookings</h1>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(t => (
                    <Link key={t} href={`/admin/bookings?status=${t}`} className={`px-4 py-2 rounded-full border text-sm font-semibold capitalize transition-all whitespace-nowrap ${statusFilter === t ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}>
                        {t}
                    </Link>
                ))}
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
                {(!bookings || bookings.length === 0) ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                        <span className="text-6xl mb-4">📭</span>
                        <h3 className="text-xl font-bold text-white mb-2">No bookings found</h3>
                        <p>There are no bookings matching the current filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-slate-900/50">
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Ref</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Customer</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Vehicle</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Dates</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Total</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Status</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-slate-400 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => {
                                    const car = Array.isArray(b.cars) ? b.cars[0] : b.cars;
                                    const profile = Array.isArray(b.user_profiles) ? b.user_profiles[0] : b.user_profiles;
                                    return (
                                        <tr key={b.id} className="border-b border-white/5 hover:bg-slate-900/30 transition-colors">
                                            <td className="p-4 font-mono text-sm text-white">{b.booking_ref || `#${b.id}`}</td>
                                            <td className="p-4 text-sm">
                                                <div className="text-white font-semibold">{profile?.display_name || 'Customer'}</div>
                                                <div className="text-slate-400 text-xs">ID: {b.user_id?.slice(0, 8)}...</div>
                                            </td>
                                            <td className="p-4 text-sm text-white font-medium">{car ? `${car.manufacturer} ${car.model}` : 'Unknown'}</td>
                                            <td className="p-4 text-xs text-slate-300">
                                                {b.date_range || 'N/A'}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-emerald-400">{formatCurrency(b.total_price ?? 0)}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${getStatusColor(b.status)}`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <form action={updateStatus} className="flex gap-2">
                                                    <input type="hidden" name="bookingId" value={b.id} />
                                                    <select name="status" defaultValue={b.status} className="bg-slate-900 border border-white/10 text-white text-xs rounded-lg p-2 outline-none focus:border-emerald-500">
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="active">Active</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                    <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                        Update
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}