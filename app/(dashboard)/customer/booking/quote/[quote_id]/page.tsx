import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { formatMoney, formatRentalDate, validVehicleId, rentalLocalValue, toSearchParams } from '@/lib/fleet/search'
import PickupLocation from '@/app/components/PickupLocation'
import CheckoutCommand from '../../../checkout/CheckoutCommand'

export const metadata = { title: 'Rental quote | Orbit Rides', robots: { index: false, follow: false } }
export default async function RentalQuote({ params }: { params: Promise<{ quote_id: string }> }) {
    const { user } = await requireAccount('customer')
    const { quote_id } = await params
    if (!validVehicleId(quote_id)) notFound()
    const client = await createClient<Database>()
    const { data: quote, error } = await client.from('quotes').select('*').eq('id', quote_id).eq('customer_id', user.id).maybeSingle()
    if (error) throw new Error('Your quote could not be loaded. Please retry.')
    if (!quote) notFound()
    if (quote.total_minor === null) throw new Error('This quote has no valid total. Please request a new quote.')
    const { data: booking, error: bookingError } = await client.from('bookings').select('id').eq('quote_id', quote.id).eq('customer_id', user.id).maybeSingle()
    if (bookingError) throw new Error('The saved checkout could not be loaded. Please retry.')
    const expired = new Date(quote.expires_at).getTime() <= Date.now()
    return <div className="max-w-3xl mx-auto p-8 space-y-5"><h1 className="text-3xl font-bold">Your rental quote</h1>
        <h2 className="text-xl">{quote.vehicle_label}</h2><p>Customer: {quote.customer_name}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3"><dt>Pickup</dt><dd>{formatRentalDate(quote.starts_at)} IST</dd><dt>Return</dt><dd>{formatRentalDate(quote.ends_at)} IST</dd><dt>Billable 24-hour periods</dt><dd>{quote.billable_days}</dd><dt>Rate per period</dt><dd>{formatMoney(quote.rate_minor)}</dd><dt>Total demo rental value</dt><dd className="font-bold">{formatMoney(quote.total_minor)}</dd></dl>
        <PickupLocation snapshot={quote.pickup_location_snapshot} />
        <p role="status">{expired ? 'This quote has expired for starting a new checkout.' : `Quote valid until ${formatRentalDate(quote.expires_at)} IST. A quote does not hold the vehicle.`}</p>
        <p>Demo payment — no money will be transferred.</p>
        {booking ? <Link className="btn btn-primary" href={`/customer/checkout/${booking.id}`}>Resume existing checkout</Link> : !expired && quote.hold_seconds && <><p>Checkout reserves this vehicle for up to {quote.hold_seconds / 60} minutes, ending no later than pickup time.</p><CheckoutCommand command="begin" userId={user.id} identifier={quote.id} label="Continue to checkout" /></>}
        <Link className="btn btn-outline" href={`/customer/cars/${quote.vehicle_id}?${toSearchParams({ pickup: rentalLocalValue(quote.starts_at), dropoff: rentalLocalValue(quote.ends_at) })}`}>Return to vehicle and dates</Link>
    </div>
}
