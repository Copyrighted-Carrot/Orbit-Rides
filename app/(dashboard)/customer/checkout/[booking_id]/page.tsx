import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readCheckout } from '@/lib/booking/checkout'
import { authRedirectUrl } from '@/lib/auth/config'
import { formatMoney, formatRentalDate } from '@/lib/fleet/search'
import CheckoutSession from './CheckoutSession'
import PickupLocation from '@/app/components/PickupLocation'

export const metadata = { title: 'Demo checkout | Orbit Rides', robots: { index: false, follow: false } }
export default async function Checkout({ params }: { params: Promise<{ booking_id: string }> }) {
    const { booking_id } = await params
    const record = await readCheckout(booking_id)
    if (!record) notFound()
    const { booking, quote, payment } = record
    return <div className="max-w-3xl mx-auto w-full p-6 space-y-5">
        <h1 className="text-3xl font-bold">Demo checkout</h1><p>Booking reference: <strong>{booking.reference}</strong></p>
        <h2 className="text-xl">{quote.vehicle_label}</h2>
        <p>{formatRentalDate(quote.starts_at)} – {formatRentalDate(quote.ends_at)} IST</p>
        <p>{quote.billable_days} × {formatMoney(quote.rate_minor)} = <strong>{formatMoney(payment.amount_minor)}</strong></p>
        <p className="font-semibold">Demo payment — no money will be transferred.</p>
        <PickupLocation snapshot={quote.pickup_location_snapshot} /><CheckoutSession initial={record} paymentUrl={authRedirectUrl(`/customer/payment/${payment.id}`)} />
        <Link className="link" href={`/customer/bookings/${booking.id}`}>Booking details and timeline</Link>
        <Link className="link block" href="/customer/bookings">Booking history</Link>
    </div>
}
