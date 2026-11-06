import NewCarPageContent from './NewCarPageContent'
import { readVehicleTypes } from '@/lib/fleet/admin'

export const metadata = { title: 'Add vehicle | Orbit Rides', robots: { index: false, follow: false } }

export default async function NewCarPage() {
    const types = await readVehicleTypes()
    return <NewCarPageContent types={types} />
}
