import Link from 'next/link'
import CarCard from './CarCard'
import FleetSearchForm from '@/app/components/FleetSearchForm'
import { getCatalogue, getVehicleTypes, getPickupLocation } from '@/lib/fleet/catalogue'
import { parseSearchParams, toSearchParams } from '@/lib/fleet/search'
import { requireAccount } from '@/lib/auth/account'
import { readSavedIds } from '@/lib/activity/data'

export const metadata = { title: 'Browse vehicles | Orbit Rides', robots: { index: false, follow: false } }

export default async function CustomerCarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { user } = await requireAccount('customer')
    const parsed = parseSearchParams(await searchParams)
    const [types, pickup] = await Promise.all([getVehicleTypes(), getPickupLocation()])
    const result = parsed.error ? null : await getCatalogue(parsed)
    const savedIds = await readSavedIds(result?.vehicles.map(vehicle => vehicle.id) || [])
    const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1
    const pageHref = (page: number) => '/customer/cars?' + toSearchParams({ ...parsed.filters, page })
    return <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-10 space-y-6">
        <h1 className="text-3xl font-bold">Browse vehicles</h1>
        {pickup ? <p>Fixed pickup: <strong>{pickup.name}</strong>, {pickup.address}, {pickup.city}.</p> : <p role="status">Pickup details are currently unavailable. You can browse the fleet; rentals cannot be quoted until pickup is available.</p>}
        <FleetSearchForm filters={parsed.filters} types={types} />
        {parsed.error && <p role="alert" className="text-error">{parsed.error}</p>}
        {result && <>
            <p role="status">{result.total} {result.total === 1 ? 'vehicle' : 'vehicles'} {parsed.startsAt ? 'available for the selected interval' : 'in the published catalogue. Choose dates to check availability'}.</p>
            {result.mediaWarning && <p role="status">Some photos could not be loaded. Vehicle details are still available.</p>}
            <form id="compare-form" action="/customer/compare" method="get" className="flex flex-wrap gap-4 items-center"><input type="hidden" name="pickup" value={parsed.filters.pickup} /><input type="hidden" name="dropoff" value={parsed.filters.dropoff} /><button className="btn btn-outline">Compare selected vehicles</button><p>Select two or three vehicles below.</p><Link className="link" href="/customer/activity">Saved activity</Link></form>
            {result.vehicles.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{result.vehicles.map(vehicle => <CarCard key={vehicle.id} vehicle={vehicle} filters={parsed.filters} userId={user.id} saved={savedIds.has(vehicle.id)} compare />)}</div>
                : <div className="rounded-lg border p-6 space-y-3"><h2 className="text-xl font-semibold">No vehicles match this page of results</h2><p>Try different dates, a different daily price, or clear the filters.</p><Link className="link" href="/customer/cars">Clear filters</Link>{parsed.filters.page > 1 && <Link className="link ml-4" href={pageHref(1)}>First results page</Link>}</div>}
            <nav aria-label="Vehicle results pages" className="flex gap-4 items-center">
                {result.page > 1 && <Link className="btn btn-outline" href={pageHref(result.page - 1)}>Previous</Link>}
                <span>Page {result.page} of {pages}</span>
                {result.page < pages && <Link className="btn btn-outline" href={pageHref(result.page + 1)}>Next</Link>}
            </nav>
        </>}
    </div>
}
