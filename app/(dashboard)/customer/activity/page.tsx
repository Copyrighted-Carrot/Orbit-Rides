import Link from 'next/link'
import { requireAccount } from '@/lib/auth/account'
import { readActivitySummary, readVehicleActivity, readOwnReviews, ACTIVITY_PAGE_SIZE } from '@/lib/activity/data'
import { formatMoney, formatRentalDate } from '@/lib/fleet/search'
import FleetImage from '@/app/components/FleetImage'
import SaveVehicleButton from '@/app/components/SaveVehicleButton'

export const metadata = { title: 'Saved activity | Orbit Rides', robots: { index: false, follow: false } }
export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { user } = await requireAccount('customer')
    const params = await searchParams
    const view = params.view === 'recent' || params.view === 'reviews' ? params.view : 'saved'
    const page = typeof params.page === 'string' && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1
    if ((params.view !== undefined && !['saved', 'recent', 'reviews'].includes(String(params.view))) || Array.isArray(params.view)
        || (params.page !== undefined && (typeof params.page !== 'string' || !/^[1-9]\d{0,3}$/.test(params.page)))) {
        return <div className="p-8"><p role="alert">Choose a valid activity view and page.</p><Link className="link" href="/customer/activity">Open saved activity</Link></div>
    }
    const summary = await readActivitySummary()
    const vehicles = view !== 'reviews' ? await readVehicleActivity(view, page) : null
    const reviews = view === 'reviews' ? await readOwnReviews(page) : null
    const total = vehicles?.total ?? reviews?.total ?? 0, pages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE))
    const href = (value: number) => '/customer/activity?' + new URLSearchParams({ view, page: String(value) })
    return <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Saved activity</h1>
        <nav aria-label="Activity views" className="flex flex-wrap gap-4">
            <Link className="link" href="?view=saved" aria-current={view === 'saved' ? 'page' : undefined}>Wishlist ({summary.saved})</Link>
            <Link className="link" href="?view=recent" aria-current={view === 'recent' ? 'page' : undefined}>Recently viewed ({summary.recent})</Link>
            <Link className="link" href="?view=reviews" aria-current={view === 'reviews' ? 'page' : undefined}>My reviews ({summary.reviews})</Link>
        </nav>
        {view === 'recent' && <p>Your 20 most recently viewed vehicles. Repeat views update recency without creating another record.</p>}
        {view === 'reviews' && <p>Reviews from your completed demo rentals. Vehicle labels below are preserved from each booking.</p>}
        {vehicles?.mediaWarning && <p role="status">Some vehicle photos could not be loaded. Refresh to retry.</p>}
        {vehicles && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{vehicles.items.map(vehicle => <article key={vehicle.id} data-vehicle-id={vehicle.id} className="border rounded-lg overflow-hidden">
            <FleetImage src={vehicle.coverUrl} alt={vehicle.label} className="h-40" />
            <div className="p-4 space-y-3"><h2 className="text-xl font-semibold">{vehicle.label}</h2>
                {vehicle.visible ? <><p>{vehicle.typeName} · {vehicle.rate !== null && formatMoney(vehicle.rate) + ' per started 24 hours'}</p><p>Current condition: {vehicle.condition}. Choose dates to check availability.</p><Link className="link" href={'/customer/cars/' + vehicle.id}>View vehicle</Link></>
                    : <p>{vehicle.condition === 'archived' ? 'Archived vehicle' : 'No longer published'} — retained in your activity; unavailable for new bookings.</p>}
                <p className="text-sm">{view === 'saved' ? 'Saved' : 'Last viewed'} {formatRentalDate(vehicle.observedAt)} IST</p>
                {view === 'saved' && <SaveVehicleButton userId={user.id} vehicleId={vehicle.id} saved />}
            </div>
        </article>)}</div>}
        {reviews && <div className="space-y-4">{reviews.items.map(review => <article key={review.booking_id} className="border rounded-lg p-4 space-y-2">
            <h2 className="text-xl font-semibold">{review.vehicleLabel}</h2><p>{review.rating} / 5 · Completed demo rental</p><p className="whitespace-pre-wrap break-words">{review.comment}</p><p>{formatRentalDate(review.created_at)} IST</p><Link className="link break-all" href={'/customer/bookings/' + review.booking_id + '#rental-review'}>{review.reference}</Link>
        </article>)}</div>}
        {!(vehicles?.items.length || reviews?.items.length) && <p role="status">{view === 'reviews' ? 'No submitted reviews on this page. Open a completed booking to review it.' : view === 'recent' ? 'No recently viewed vehicles on this page. Open a vehicle to record a view.' : 'No saved vehicles on this page. Add a vehicle to your wishlist from the catalogue.'}</p>}
        <nav aria-label="Activity pages" className="flex gap-4"><span>{total} records · Page {page} of {pages}</span>{page > 1 && <Link className="link" href={href(page - 1)}>Previous</Link>}{page < pages && <Link className="link" href={href(page + 1)}>Next</Link>}</nav>
        <div className="flex flex-wrap gap-4"><Link className="link" href="/customer/cars">Browse vehicles</Link><Link className="link" href="/customer/bookings?state=completed">Completed rentals</Link><Link className="link" href="/customer/profile">My profile</Link></div>
    </div>
}
