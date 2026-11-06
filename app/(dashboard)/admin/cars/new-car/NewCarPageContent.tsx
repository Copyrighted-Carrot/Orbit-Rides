import VehicleForm from '../VehicleForm'
import type { FleetType } from '@/lib/fleet/admin'

export default function NewCarPageContent({ types }: { types: FleetType[] }) {
    return <VehicleForm types={types} />
}
