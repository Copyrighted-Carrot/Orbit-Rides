import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { getVehicle, getPickupLocation, vehicleAvailable } from '@/lib/fleet/catalogue'
import { parseSearchParams, formatMoney, toSearchParams, RENTAL_TIME_LABEL } from '@/lib/fleet/search'
import FleetImage from '@/app/components/FleetImage'
import FleetSearchForm from '@/app/components/FleetSearchForm'
import QuoteRequestForm from './QuoteRequestForm'

export const metadata = { title: 'Vehicle details | Orbit Rides', robots: { index: false, follow: false } }

export default async function VehicleDetails({ params, searchParams }: { params: Promise<{ vehicle_id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { user } = await requireAccount('customer')
    const { vehicle_id } = await params
    const result = await getVehicle(vehicle_id)
    if (!result) notFound()
    const query = await searchParams
    const search = parseSearchParams({ pickup: query.pickup, dropoff: query.dropoff })
    const pickup = await getPickupLocation()
    const available = !search.error && search.startsAt && search.endsAt ? await vehicleAvailable(vehicle_id, search.startsAt, search.endsAt) : null
    const { vehicle, gallery } = result
    const label = `${vehicle.manufacturer} ${vehicle.model}`
    return <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <Link href={'/customer/cars?' + toSearchParams(search.filters)} className="link">Back to fleet</Link>
        <h1 className="text-3xl font-bold">{label}</h1>
        <p>{vehicle.type_name} · {formatMoney(vehicle.daily_rate_minor)} per started 24 hours</p>
        <FleetImage src={vehicle.cover_url} alt={label} className="h-64 md:h-96 w-full rounded-lg overflow-hidden" />
        <section aria-label="Vehicle gallery" className="space-y-4">
            {['exterior', 'interior', 'cockpit', 'rear', 'detail'].map(category => {
                const shots = gallery.filter(image => image.category === category)
                return <div key={category}><h2 className="text-lg font-semibold capitalize">{category}</h2>{shots.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shots.map(image => <FleetImage key={image.id} src={image.url} alt={`${label} ${category} ${image.position + 1}`} className="h-48 rounded-lg overflow-hidden" />)}</div> : <p className="text-sm opacity-70">No {category} photos available.</p>}</div>
            })}
            {result.mediaWarning && <p role="status">Some photos could not be loaded. Refresh to retry.</p>}
        </section>
        <section className="space-y-4" aria-label="Rental availability"><h2 className="text-xl font-semibold">Rental dates</h2>
            <FleetSearchForm action={`/customer/cars/${vehicle.id}`} filters={search.filters} requiredDates />
            {search.error && <p role="alert" className="text-error">{search.error}</p>}
            {pickup ? <div><h3 className="font-semibold">Fixed pickup location</h3><p>{pickup.name}, {pickup.address}, {pickup.city}</p></div> : <p role="status">Pickup details are currently unavailable. Rental quotes are unavailable until pickup is confirmed.</p>}
            {available === false && <p role="status">This vehicle is unavailable for those dates. Choose another interval or return to the fleet.</p>}
            {available === null && !search.error && <p>Choose dates to check availability. All times use {RENTAL_TIME_LABEL}.</p>}
            {available && <><p role="status">Available for these dates. A quote does not hold the vehicle; availability is checked again at checkout.</p>{pickup && <QuoteRequestForm vehicleId={vehicle.id} userId={user.id} requestId={crypto.randomUUID()} pickup={search.filters.pickup} dropoff={search.filters.dropoff} />}</>}
        </section>
    </div>
}
