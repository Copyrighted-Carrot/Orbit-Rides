import Link from 'next/link'
import { formatMoney, formatRentalDate } from '@/lib/fleet/search'
import { BOOKING_STATES, pickupSnapshot, stateLabel, type BookingRecord, type readBookingHistory } from '@/lib/booking/history'

export default function BookingSummary({ record, showCustomer = false }: { record: BookingRecord; showCustomer?: boolean }) {
    const { booking, quote, payment } = record
    const pickup = pickupSnapshot(quote.pickup_location_snapshot)
    return <section className="border rounded-lg p-5 space-y-4" aria-label="Booking summary">
        <h2 className="text-xl font-semibold">{quote.vehicle_label}</h2>
        <p className="font-mono break-all" data-testid="booking-reference">{booking.reference}</p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            <dt>Booking state</dt><dd data-testid="booking-state">{stateLabel(booking.state)}</dd>
            <dt>Payment state</dt><dd data-testid="payment-state">{stateLabel(payment.state)} {payment.provider === 'demo' ? '(demo)' : `(${payment.provider})`}</dd>
            {showCustomer && <><dt>Customer at booking</dt><dd>{quote.customer_name || 'Customer'}</dd></>}
            <dt>Pickup</dt><dd>{formatRentalDate(quote.starts_at)} IST</dd>
            <dt>Return</dt><dd>{formatRentalDate(quote.ends_at)} IST</dd>
            <dt>Pickup location</dt><dd>{pickup ? <>{pickup.city}<span className="block text-sm">Demo pickup location</span></> : 'Not recorded on this earlier demo booking'}</dd>
            <dt>Billable 24-hour periods</dt><dd>{quote.billable_days}</dd>
            <dt>Rate per period</dt><dd>{formatMoney(quote.rate_minor)}</dd>
            <dt>Total demo rental value</dt><dd className="font-semibold">{formatMoney(quote.total_minor!)}</dd>
            <dt>Booking created</dt><dd>{formatRentalDate(booking.created_at)} IST</dd>
        </dl>
        {['held', 'awaiting_confirmation'].includes(booking.state) && <p>Reservation hold deadline: {formatRentalDate(booking.hold_expires_at)} IST. Checkout verifies the current hold and payment state before confirmation.</p>}
        <p>Demo payment — no money will be transferred.</p>
    </section>
}

export function BookingHistoryView({ result, role }: { result: Awaited<ReturnType<typeof readBookingHistory>>; role: 'customer' | 'admin' }) {
    const base = `/${role}/bookings`
    const pageLink = (page: number) => base + '?' + new URLSearchParams({ q: result.filters.q, state: result.filters.state, page: String(page) })
    return <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <h1 className="text-3xl font-bold">{role === 'admin' ? 'Booking overview' : 'Booking history'}</h1>
        <p>Demo payment — no money will be transferred.</p>
        <div className="flex flex-wrap gap-4">{role === 'customer' ? <><Link className="link" href="/customer/cars">Browse vehicles</Link><Link className="link" href="/customer/notifications">Notifications</Link></> : <Link className="link" href="/admin/cars">Manage fleet</Link>}</div>
        <form action={base} method="get" className="flex flex-wrap items-end gap-4">
            <label className="form-control gap-1">Booking reference<input className="input input-bordered" type="search" name="q" maxLength={80} defaultValue={result.filters.q} placeholder="ORB-…" /></label>
            <label className="form-control gap-1">Booking state<select className="select select-bordered" name="state" aria-label="Booking state" defaultValue={result.filters.state}><option value="all">All states</option>{BOOKING_STATES.map(state => <option key={state} value={state}>{stateLabel(state)}</option>)}</select></label>
            <button className="btn btn-outline" type="submit">Apply filters</button><Link className="link self-center" href={base}>Clear filters</Link>
        </form>
        {result.filters.error ? <p role="alert">{result.filters.error}</p> : <>
            <p role="status">{result.total} {result.total === 1 ? 'booking' : 'bookings'} matching these filters.</p>
            {result.records.length ? <div className="grid gap-5 lg:grid-cols-2">{result.records.map(({ booking, quote, payment }) => {
                const pickup = pickupSnapshot(quote.pickup_location_snapshot)
                return <article key={booking.id} className="border rounded-lg p-5 space-y-3" data-booking-id={booking.id}>
                    <h2 className="text-xl font-semibold">{quote.vehicle_label}</h2><p className="font-mono break-all">{booking.reference}</p>
                    {role === 'admin' && <p>Customer at booking: {quote.customer_name || 'Customer'}</p>}
                    <p>Booking: <strong>{stateLabel(booking.state)}</strong> · Demo payment: {stateLabel(payment.state)}</p>
                    <p>{formatRentalDate(quote.starts_at)} – {formatRentalDate(quote.ends_at)} IST</p>
                    <p>Pickup location: {pickup?.city || 'Not recorded on this earlier demo booking'}{pickup && <span className="block text-sm">Demo pickup location</span>}</p>
                    <p>Total demo rental value: {formatMoney(quote.total_minor!)}</p>
                    <p className="text-sm">Created {formatRentalDate(booking.created_at)} IST</p>
                    {['held', 'awaiting_confirmation'].includes(booking.state) && <p className="text-sm">Hold deadline: {formatRentalDate(booking.hold_expires_at)} IST. Resume checkout to verify its current state.</p>}
                    <div className="flex flex-wrap gap-3"><Link className="btn btn-outline" href={`${base}/${booking.id}`}>View booking and timeline</Link>{role === 'customer' && ['held', 'awaiting_confirmation'].includes(booking.state) && <Link className="btn btn-primary" href={`/customer/checkout/${booking.id}`}>Resume checkout</Link>}</div>
                </article>
            })}</div> : <p role="status">No bookings on this page. Adjust the filters or return to the first page.</p>}
            <nav aria-label="Booking history pages" className="flex gap-4 items-center">{result.filters.page > 1 && <Link className="btn btn-outline" href={pageLink(result.filters.page - 1)}>Previous</Link>}<span>Page {result.filters.page} of {result.pages}</span>{result.filters.page < result.pages && <Link className="btn btn-outline" href={pageLink(result.filters.page + 1)}>Next</Link>}</nav>
        </>}
    </div>
}
