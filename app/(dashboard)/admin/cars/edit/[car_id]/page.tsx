import { readAdminVehicle, readVehicleTypes } from '@/lib/fleet/admin'
import EditCarPageContent from './EditCarPageContent'

export const metadata = { title: 'Edit vehicle | Orbit Rides', robots: { index: false, follow: false } }

export default async function EditCarPage({ params }: { params: Promise<{ car_id: string }> }) {
    const { car_id } = await params
    const [vehicle, types] = await Promise.all([readAdminVehicle(car_id), readVehicleTypes()])
    return <EditCarPageContent vehicle={vehicle} types={types} />
}
