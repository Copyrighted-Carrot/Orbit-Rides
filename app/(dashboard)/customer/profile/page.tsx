import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaUser, FaWallet, FaHeart, FaCalendarDays, FaCar, FaAngleRight, FaIdCard, FaPhone } from 'react-icons/fa6';

export const metadata = {
    title: 'My Profile | Orbit Rides',
    description: 'View and manage your Orbit Rides profile, bookings, and saved vehicles.',
};

export default async function CustomerProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/customer/login');
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // Fetch total bookings & spent
    const { data: allBookings } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('user_id', user.id);

    const totalBookings = allBookings?.length || 0;
    const totalSpent = allBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

    // Fetch recent bookings (last 3)
    const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
            *,
            cars (
                manufacturer,
                model,
                img_urls
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

    // Fetch wishlist count
    const { count: wishlistCount } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    const avatarUrl = user.user_metadata?.picture || profile?.avatar_url;
    const displayName = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || 'Valued Customer';
    const email = user.email;
    const memberSince = new Date(user.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header section */}
                <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden shrink-0 border-4 border-emerald-500/30">
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-emerald-950 flex items-center justify-center text-4xl text-emerald-400 font-bold">
                                {displayName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                        <p className="text-slate-400">{email}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                            <FaCalendarDays className="text-emerald-400" />
                            Member since {memberSince}
                        </div>
                    </div>
                    <div className="shrink-0 pt-2">
                        <Link href="/customer/settings" className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors inline-flex items-center gap-2">
                            <FaUser />
                            Edit Profile
                        </Link>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
                            <FaCar />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Total Bookings</p>
                            <p className="text-2xl font-bold text-white">{totalBookings}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                            <FaWallet />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Total Spent</p>
                            <p className="text-2xl font-bold text-white">₹{totalSpent.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl shrink-0">
                            <FaHeart />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Wishlist Saved</p>
                            <p className="text-2xl font-bold text-white">{wishlistCount || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Bookings */}
                    <div className="lg:col-span-2 bg-slate-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Recent Bookings</h2>
                            <Link href="/customer/bookings" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1">
                                View All <FaAngleRight />
                            </Link>
                        </div>
                        
                        <div className="space-y-4">
                            {recentBookings && recentBookings.length > 0 ? (
                                recentBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0">
                                            <Image 
                                                src={booking.cars?.img_urls?.[0] || '/images/car-owners.jpg'} 
                                                alt="Car" 
                                                fill 
                                                className="object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-bold truncate">
                                                {booking.cars?.manufacturer} {booking.cars?.model}
                                            </h3>
                                            <p className="text-sm text-slate-400">
                                                {new Date(booking.created_at).toLocaleDateString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-white font-bold">
                                                ₹{(booking.total_price || 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block capitalize ${
                                                booking.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                booking.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {booking.status}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                    No recent bookings found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-sm h-fit">
                        <h2 className="text-xl font-bold text-white mb-6">Profile Details</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <FaPhone className="text-xs" />
                                    <span className="text-sm font-medium">Phone Number</span>
                                </div>
                                <div className="text-white font-medium">
                                    {profile?.phone || <span className="text-slate-500 italic">Not provided</span>}
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <FaIdCard className="text-xs" />
                                    <span className="text-sm font-medium">License Number</span>
                                </div>
                                <div className="text-white font-medium">
                                    {profile?.license_number || <span className="text-slate-500 italic">Not provided</span>}
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <FaCalendarDays className="text-xs" />
                                    <span className="text-sm font-medium">License Expiry</span>
                                </div>
                                <div className="text-white font-medium">
                                    {profile?.license_expiry ? new Date(profile.license_expiry).toLocaleDateString('en-IN') : <span className="text-slate-500 italic">Not provided</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <Link href="/customer" className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors inline-flex items-center justify-center gap-2">
                                <FaCar className="text-emerald-400" />
                                Browse Cars
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
