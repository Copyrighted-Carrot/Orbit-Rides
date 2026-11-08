import Link from 'next/link'
import FleetImage from '@/app/components/FleetImage'
import type { FleetCard } from '@/lib/fleet/catalogue'
import { formatMoney, toSearchParams, type SearchFilters } from '@/lib/fleet/search'
import SaveVehicleButton from '@/app/components/SaveVehicleButton'
import { RatingSummary } from '@/app/components/VehicleReviews'

export default function CarCard({ vehicle, filters = {}, userId, saved = false, compare = false }: { vehicle: FleetCard; filters?: Partial<SearchFilters>; userId?: string; saved?: boolean; compare?: boolean }) {
    const label = `${vehicle.manufacturer} ${vehicle.model}`
    const query = toSearchParams({ pickup: filters.pickup, dropoff: filters.dropoff }).toString()
    return <article className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <Link href={`/customer/cars/${vehicle.id}${query ? '?' + query : ''}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <FleetImage src={vehicle.cover_url} alt={label} className="h-48 w-full" />
            <div className="card-body gap-3"><h2 className="card-title">{label}</h2><p>{vehicle.type_name}</p>
                <p className="font-semibold">{formatMoney(vehicle.daily_rate_minor)} / started 24 hours</p>
                <RatingSummary rating={vehicle} />
                {vehicle.operational_state !== 'available' && <p className="text-warning">Currently under {vehicle.operational_state}</p>}
                <span className="link">View vehicle and rental details</span>
            </div>
        </Link>
        {(userId || compare) && <div className="px-6 pb-6 space-y-3">{userId && <SaveVehicleButton userId={userId} vehicleId={vehicle.id} saved={saved} />}
            {compare && <label className="flex gap-2 items-center"><input type="checkbox" className="checkbox checkbox-sm" name="vehicle" value={vehicle.id} form="compare-form" />Compare {label}</label>}
        </div>}
    </article>
}
