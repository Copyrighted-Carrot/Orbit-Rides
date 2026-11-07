import Link from 'next/link'
import BookingSummary from '@/app/components/BookingSummary'
import BookingTimeline from '@/app/components/BookingTimeline'
import CancellationPanel from '@/app/components/CancellationPanel'
import { readBookingDetail, type SearchValues } from '@/lib/booking/history'
import { formatRentalDate } from '@/lib/fleet/search'

export const metadata = { title: 'Booking overview | Orbit Rides', robots: { index: false, follow: false } }

export default async function AdminBookingDetail({ params, searchParams }: { params: Promise<{ booking_id: string }>; searchParams: Promise<SearchValues> }) {
    const { booking_id } = await params
    const { events } = await searchParams
    const detail = await readBookingDetail('admin', booking_id, events)
    return <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <Link className="link" href="/admin/bookings">Back to booking overview</Link>
        <h1 className="text-3xl font-bold">Booking overview</h1>
        {detail.confirmedAt && <p>Confirmed {formatRentalDate(detail.confirmedAt)} IST.</p>}
        <BookingSummary record={detail.record} showCustomer />
        <CancellationPanel bookingId={detail.record.booking.id} state={detail.record.booking.state} userId={detail.userId} role="admin" requests={detail.cancellations} total={detail.cancellationCount} />
        <BookingTimeline events={detail.events} page={detail.eventPage} pages={detail.eventPages} total={detail.eventCount} basePath={`/admin/bookings/${detail.record.booking.id}`} />
    </div>
}
