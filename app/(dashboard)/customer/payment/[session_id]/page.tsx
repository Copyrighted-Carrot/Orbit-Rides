import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { readOwnedPayment } from '@/lib/booking/checkout'
import { formatMoney, formatRentalDate } from '@/lib/fleet/search'
import CheckoutCommand from '../../checkout/CheckoutCommand'

export const metadata = { title: 'Approve demo payment | Orbit Rides', robots: { index: false, follow: false } }
export default async function DemoPayment({ params }: { params: Promise<{ session_id: string }> }) {
    const { user } = await requireAccount('customer')
    const { session_id } = await params
    const record = await readOwnedPayment(user.id, session_id)
    if (!record) notFound()
    const { booking, quote, payment } = record
    const expired = Date.parse(record.serverNow) >= Date.parse(booking.hold_expires_at)
    return <div className="max-w-2xl mx-auto w-full p-6 space-y-5">
        <h1 className="text-3xl font-bold">Demo payment</h1>
        <p className="font-semibold">Demo payment — no money will be transferred.</p>
        <p>Opening this page or scanning the QR does not approve payment.</p>
        <p>Booking reference: <strong>{booking.reference}</strong></p><p>{quote.vehicle_label}</p>
        <p>Demo amount: <strong>{formatMoney(payment.amount_minor)}</strong> · {payment.currency}</p>
        <p>Payment state: <strong>{payment.state}</strong></p>
        {payment.provider !== 'demo' ? <p role="alert">This provider is unavailable in the demo.</p> : payment.state === 'pending' && !expired ? <>
            <p>Approve before {formatRentalDate(booking.hold_expires_at)} IST.</p>
            <CheckoutCommand command="approve" userId={user.id} identifier={payment.id} label="Approve demo payment" />
            <CheckoutCommand command="decline" userId={user.id} identifier={payment.id} label="Decline demo payment" />
        </> : payment.state === 'succeeded' ? <>
            <p role="status">Demo approval recorded. No money was transferred.</p>
            {booking.state === 'awaiting_confirmation' && <CheckoutCommand command="confirm" userId={user.id} identifier={payment.id} label="Confirm booking" />}
        </> : <p role="status">This session cannot accept approval. Refresh its status to reconcile an elapsed deadline.</p>}
        <CheckoutCommand command="reconcile" userId={user.id} identifier={payment.id} label="Refresh payment status" />
        <Link className="btn btn-outline" href={`/customer/checkout/${booking.id}`}>Return to checkout</Link>
        <Link className="link block" href={`/customer/bookings/${booking.id}`}>Booking details and timeline</Link>
    </div>
}
