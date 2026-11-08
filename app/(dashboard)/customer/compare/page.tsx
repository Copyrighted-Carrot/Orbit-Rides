import Link from 'next/link'
import { requireAccount } from '@/lib/auth/account'
import { getVehicle, vehicleAvailable } from '@/lib/fleet/catalogue'
import { parseSearchParams, validVehicleId, toSearchParams } from '@/lib/fleet/search'
import CarComparator from '@/app/components/CarComparator'

export const metadata = { title: 'Compare vehicles | Orbit Rides', robots: { index: false, follow: false } }
export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    await requireAccount('customer')
    const params = await searchParams
    const selection = Array.isArray(params.vehicle) ? params.vehicle : params.vehicle ? [params.vehicle] : []
    const ids = [...new Set(selection)]
    const search = parseSearchParams({ pickup: params.pickup, dropoff: params.dropoff })
    const error = selection.length > 3 || ids.length < 2 || ids.some(id => !validVehicleId(id)) ? 'Select two or three different vehicles from the catalogue.' : search.error
    const results = error ? [] : await Promise.all(ids.map(getVehicle))
    const unavailable = results.some(result => !result)
    const vehicles = results.flatMap(result => result ? [result.vehicle] : [])
    const availability = !error && !unavailable ? await Promise.all(vehicles.map(vehicle => search.startsAt && search.endsAt ? vehicleAvailable(vehicle.id, search.startsAt, search.endsAt) : Promise.resolve(null))) : []
    return <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Compare vehicles</h1><p>Comparison uses current vehicle records and submitted completed-rental reviews. Availability is checked again when reserving.</p>
        <Link className="link" href={'/customer/cars?' + toSearchParams(search.filters)}>Choose vehicles in the catalogue</Link>
        {error ? <p role="alert">{error}</p> : unavailable ? <p role="alert">A selected vehicle is no longer published or does not exist. Return to the catalogue and choose again.</p> : <CarComparator vehicles={vehicles} availability={availability} filters={{ pickup: search.filters.pickup, dropoff: search.filters.dropoff }} />}
    </div>
}
