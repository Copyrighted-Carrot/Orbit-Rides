import Link from 'next/link'
import FleetImage from '@/app/components/FleetImage'
import type { FleetCard } from '@/lib/fleet/catalogue'
import { formatMoney, toSearchParams, type SearchFilters } from '@/lib/fleet/search'

export default function CarCard({ vehicle, filters = {} }: { vehicle: FleetCard; filters?: Partial<SearchFilters> }) {
    const label = `${vehicle.manufacturer} ${vehicle.model}`
    const query = toSearchParams({ pickup: filters.pickup, dropoff: filters.dropoff }).toString()
    return <article className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <Link href={`/customer/cars/${vehicle.id}${query ? '?' + query : ''}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <FleetImage src={vehicle.cover_url} alt={label} className="h-48 w-full" />
            <div className="card-body gap-3"><h2 className="card-title">{label}</h2><p>{vehicle.type_name}</p>
                <p className="font-semibold">{formatMoney(vehicle.daily_rate_minor)} / started 24 hours</p>
                {vehicle.operational_state !== 'available' && <p className="text-warning">Currently under {vehicle.operational_state}</p>}
                <span className="link">View vehicle and rental details</span>
            </div>
        </Link>
    </article>
}
