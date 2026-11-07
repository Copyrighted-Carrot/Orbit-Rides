import { redirect } from 'next/navigation'
import { validVehicleId } from '@/lib/fleet/search'

export default async function LegacyCheckout({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const { quote_id } = await searchParams
    redirect(typeof quote_id === 'string' && validVehicleId(quote_id) ? `/customer/booking/quote/${quote_id}` : '/customer/bookings')
}
