import Link from 'next/link'
import BookingSummary from '@/app/components/BookingSummary'
import BookingTimeline from '@/app/components/BookingTimeline'
import { readBookingDetail, type SearchValues } from '@/lib/booking/history'
import { formatRentalDate } from '@/lib/fleet/search'

export const metadata = { title: 'Booking receipt and timeline | Orbit Rides', robots: { index: false, follow: false } }

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ booking_id: string }>; searchParams: Promise<SearchValues> }) {
    const { booking_id } = await params
    const { events } = await searchParams
    const detail = await readBookingDetail('customer', booking_id, events)
    const { booking } = detail.record
    return <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <Link className="link" href="/customer/bookings">Back to booking history</Link>
        <h1 className="text-3xl font-bold">{detail.confirmedAt ? 'Demo rental receipt' : 'Booking details'}</h1>
        {detail.confirmedAt && <p>Confirmed {formatRentalDate(detail.confirmedAt)} IST. This receipt records a simulated payment.</p>}
        <BookingSummary record={detail.record} showCustomer />
        {['held', 'awaiting_confirmation'].includes(booking.state) && <Link className="btn btn-primary" href={`/customer/checkout/${booking.id}`}>Resume checkout</Link>}
        <BookingTimeline events={detail.events} page={detail.eventPage} pages={detail.eventPages} total={detail.eventCount} basePath={`/customer/bookings/${booking.id}`} />
        <Link className="link" href="/customer/notifications">View notifications</Link>
    </div>
}
