import Link from 'next/link'
import { readAdminFleet, readVehicleTypes } from '@/lib/fleet/admin'
import CarCard from './CarCard'

export const metadata = { title: 'Manage fleet | Orbit Rides', robots: { index: false, follow: false } }

export default async function AdminCarsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }> }) {
    const params = await searchParams
    const [fleet, types] = await Promise.all([readAdminFleet(params), readVehicleTypes()])
    const pageLink = (page: number) => {
        const query = new URLSearchParams({ page: String(page), q: fleet.search, status: fleet.status, type: fleet.type })
        return `/admin/cars?${query}`
    }
    return <div className="flex flex-col gap-6 py-10 px-4 md:px-8 lg:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Manage fleet</h1>
            <div className="flex gap-3"><Link className="btn btn-outline" href="/admin/cars/pickup-location">Pickup location</Link><Link className="btn btn-primary" href="/admin/cars/new-car">Add vehicle</Link></div>
        </div>
        <form method="get" className="flex flex-wrap gap-4 items-end">
            <label className="form-control gap-1" htmlFor="fleet-search">Search fleet
                <input id="fleet-search" type="search" name="q" maxLength={80} defaultValue={fleet.search} className="input input-bordered" placeholder="Fleet code, manufacturer or model" />
            </label>
            <label className="form-control gap-1" htmlFor="fleet-status">Status
                <select id="fleet-status" name="status" defaultValue={fleet.status} className="select select-bordered">
                    <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option><option value="inspection">Inspection</option><option value="archived">Archived</option>
                </select>
            </label>
            <label className="form-control gap-1" htmlFor="fleet-type">Vehicle type
                <select id="fleet-type" name="type" defaultValue={fleet.type} className="select select-bordered">
                    <option value="">All types</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
            </label>
            <button className="btn btn-outline" type="submit">Apply filters</button>
            <Link className="link self-center" href="/admin/cars">Clear filters</Link>
        </form>
        <p role="status">{fleet.total} vehicle{fleet.total === 1 ? '' : 's'} matching these filters.</p>
        {fleet.vehicles.length ? <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" aria-label="Fleet vehicles">
            {fleet.vehicles.map(vehicle => <CarCard key={vehicle.id} vehicle={vehicle} typeName={types.find(type => type.id === vehicle.vehicle_type_id)?.name || 'Vehicle'} />)}
        </section> : <div className="border rounded-lg p-8"><h2 className="text-xl font-semibold">No vehicles on this page</h2><p>Adjust the filters or return to the first page.</p><Link className="link" href={pageLink(1)}>First page</Link></div>}
        <nav aria-label="Fleet pages" className="flex items-center gap-4">
            {fleet.page > 1 && <Link className="btn btn-outline" href={pageLink(fleet.page - 1)}>Previous</Link>}
            <span>Page {fleet.page} of {fleet.pages}</span>
            {fleet.page < fleet.pages && <Link className="btn btn-outline" href={pageLink(fleet.page + 1)}>Next</Link>}
        </nav>
    </div>
}
