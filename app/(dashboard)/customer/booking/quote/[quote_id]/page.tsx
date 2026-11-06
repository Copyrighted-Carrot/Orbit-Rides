import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { formatMoney, formatRentalDate, validVehicleId, rentalLocalValue, toSearchParams } from '@/lib/fleet/search'

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
    const pickup = quote.pickup_location_snapshot
    const location = pickup && typeof pickup === 'object' && !Array.isArray(pickup) && typeof pickup.name === 'string' && typeof pickup.city === 'string' && typeof pickup.address === 'string' ? `${pickup.name}, ${pickup.address}, ${pickup.city}` : null
    const expired = new Date(quote.expires_at).getTime() <= Date.now()
    return <div className="max-w-3xl mx-auto p-8 space-y-5"><h1 className="text-3xl font-bold">Your rental quote</h1>
        <h2 className="text-xl">{quote.vehicle_label}</h2><p>Customer: {quote.customer_name}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3"><dt>Pickup</dt><dd>{formatRentalDate(quote.starts_at)} IST</dd><dt>Return</dt><dd>{formatRentalDate(quote.ends_at)} IST</dd><dt>Billable 24-hour periods</dt><dd>{quote.billable_days}</dd><dt>Rate per period</dt><dd>{formatMoney(quote.rate_minor)}</dd><dt>Total demo rental value</dt><dd className="font-bold">{formatMoney(quote.total_minor)}</dd><dt>Pickup location</dt><dd>{location || 'Not recorded on this earlier demo quote'}</dd></dl>
        <p role="status">{expired ? 'This quote has expired. Choose your dates again to get a current quote.' : `Quote valid until ${formatRentalDate(quote.expires_at)} IST. A quote does not hold the vehicle.`}</p>
        <p>Demo payment — no money will be transferred.</p>
        <Link className="btn btn-outline" href={`/customer/cars/${quote.vehicle_id}?${toSearchParams({ pickup: rentalLocalValue(quote.starts_at), dropoff: rentalLocalValue(quote.ends_at) })}`}>Return to vehicle and dates</Link>
    </div>
}
