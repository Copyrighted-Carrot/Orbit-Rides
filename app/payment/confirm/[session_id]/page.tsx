import { redirect } from 'next/navigation'
import { validVehicleId } from '@/lib/fleet/search'

export default async function LegacyPaymentLink({ params }: { params: Promise<{ session_id: string }> }) {
    const { session_id } = await params
    redirect(validVehicleId(session_id) ? `/customer/payment/${session_id}` : '/customer/bookings')
}
