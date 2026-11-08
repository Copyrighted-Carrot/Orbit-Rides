import { readAdminVehicle, readVehicleTypes } from '@/lib/fleet/admin'
import EditCarPageContent from './EditCarPageContent'
import VehicleReviews from '@/app/components/VehicleReviews'

export const metadata = { title: 'Edit vehicle | Orbit Rides', robots: { index: false, follow: false } }

export default async function EditCarPage({ params, searchParams }: { params: Promise<{ car_id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { car_id } = await params
    const [vehicle, types] = await Promise.all([readAdminVehicle(car_id), readVehicleTypes()])
    const { reviews } = await searchParams
    const page = typeof reviews === 'string' && /^[1-9]\d{0,3}$/.test(reviews) ? Number(reviews) : 1
    return <><EditCarPageContent vehicle={vehicle} types={types} /><div className="max-w-6xl mx-auto w-full px-4 pb-10"><VehicleReviews vehicleId={car_id} page={page} basePath={`/admin/cars/edit/${car_id}`} /></div></>
}
