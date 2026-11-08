import Link from 'next/link'
import { getOwnProfile, requireAccount } from '@/lib/auth/account'
import { readActivitySummary } from '@/lib/activity/data'

export const metadata = { title: 'My profile | Orbit Rides', robots: { index: false, follow: false } }

export default async function CustomerProfilePage() {
    await requireAccount('customer')
    const { supabase, user, displayName } = await getOwnProfile()
    const { data: summaryRows, error: summaryError } = await supabase.rpc('my_rental_summary')
    const summary = summaryRows?.[0]
    const activity = await readActivitySummary()
    return <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
            <section className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 space-y-3">
                <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                <p className="text-slate-300">{user.email}</p>
                <p className="text-slate-400">Member since {new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</p>
                <Link href="/customer/settings" className="btn btn-primary">Edit profile</Link>
            </section>
            {summaryError || !summary ? <p role="status" className="text-slate-300">Rental totals are temporarily unavailable.</p> :
                <dl className="grid sm:grid-cols-3 gap-6 text-white">
                    <div className="bg-slate-900/80 rounded-2xl p-6"><dt>Confirmed rentals</dt><dd className="text-2xl">{summary.confirmed_rentals}</dd></div>
                    <div className="bg-slate-900/80 rounded-2xl p-6"><dt>Completed rentals</dt><dd className="text-2xl">{summary.completed_rentals}</dd></div>
                    <div className="bg-slate-900/80 rounded-2xl p-6"><dt>Completed demo rental value</dt><dd className="text-2xl">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: summary.currency }).format(Number(summary.completed_demo_rental_value_minor) / 100)}</dd><p className="text-sm text-slate-400">Demo payment — no money will be transferred.</p></div>
                </dl>}
            <section aria-label="Saved activity" className="bg-slate-900/80 rounded-2xl p-6 text-white space-y-3"><h2 className="text-xl font-semibold">Saved activity</h2><div className="flex flex-wrap gap-4"><Link className="link" href="/customer/activity?view=saved">Wishlist: {activity.saved}</Link><Link className="link" href="/customer/activity?view=recent">Recently viewed: {activity.recent}</Link><Link className="link" href="/customer/activity?view=reviews">My reviews: {activity.reviews}</Link></div></section>
            <div className="flex flex-wrap gap-4">
                <Link className="btn" href="/customer/bookings">Booking history</Link>
                <Link className="btn" href="/customer">Find a vehicle</Link>
            </div>
        </div>
    </div>
}
