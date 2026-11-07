import { redirect } from 'next/navigation'
import { validVehicleId } from '@/lib/fleet/search'

export default async function LegacyReceipt({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { booking_id } = await searchParams
    redirect(typeof booking_id === 'string' && validVehicleId(booking_id) ? `/customer/bookings/${booking_id}` : '/customer/bookings')
}
