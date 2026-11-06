import { redirect } from 'next/navigation'
import { validVehicleId, parseSearchParams, toSearchParams } from '@/lib/fleet/search'

export default async function BookingEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams
    const id = typeof params.vehicle_id === 'string' ? params.vehicle_id : ''
    if (!validVehicleId(id)) redirect('/customer/cars')
    const search = parseSearchParams({ pickup: params.pickup, dropoff: params.dropoff })
    redirect(`/customer/cars/${id}?${toSearchParams(search.filters)}`)
}
