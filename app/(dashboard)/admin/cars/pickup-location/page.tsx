import Link from 'next/link'
import { requireAccount } from '@/lib/auth/account'
import { getPickupLocation } from '@/lib/fleet/catalogue'
import PickupForm from './PickupForm'

export const metadata = { title: 'Pickup location | Orbit Rides', robots: { index: false, follow: false } }
export default async function PickupPage() {
    await requireAccount('admin')
    const location = await getPickupLocation()
    return <div className="p-8 space-y-6"><Link className="link" href="/admin/cars">Back to fleet</Link><h1 className="text-3xl font-bold">Fixed pickup location</h1><PickupForm location={location} /></div>
}
