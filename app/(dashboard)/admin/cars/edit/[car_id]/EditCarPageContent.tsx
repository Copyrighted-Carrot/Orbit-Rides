import VehicleForm from '../../VehicleForm'
import type { FleetType, FleetVehicle } from '@/lib/fleet/admin'

export default function EditCarPageContent({ vehicle, types }: { vehicle: FleetVehicle; types: FleetType[] }) {
    return <VehicleForm vehicle={vehicle} types={types} />
}
