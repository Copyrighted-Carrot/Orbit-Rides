import Link from 'next/link'
import BookingSummary from '@/app/components/BookingSummary'
import BookingTimeline from '@/app/components/BookingTimeline'
import CancellationPanel from '@/app/components/CancellationPanel'
import OperationForm from '@/app/components/OperationForm'
import InspectionMedia from '@/app/components/InspectionMedia'
import { type SearchValues } from '@/lib/booking/history'
import { readOperationalBooking } from '@/lib/booking/operations'
import { formatRentalDate } from '@/lib/fleet/search'
import BookingReview from '@/app/components/BookingReview'

export const metadata = { title: 'Booking overview | Orbit Rides', robots: { index: false, follow: false } }

export default async function AdminBookingDetail({ params, searchParams }: { params: Promise<{ booking_id: string }>; searchParams: Promise<SearchValues> }) {
    const { booking_id } = await params
    const { events, media } = await searchParams
    const operations = await readOperationalBooking(booking_id, events, media)
    const { detail, vehicle, inspections, outcomes } = operations
    const { booking, quote } = detail.record
    const props = { userId: detail.userId, bookingId: booking.id }
    const pendingCancellation = detail.cancellations.some(item => item.decision === null)
    const cleared = outcomes.some(item => item.passed)
    const failed = outcomes.some(item => !item.passed)
    return <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <Link className="link" href="/admin/bookings">Back to booking overview</Link>
        <h1 className="text-3xl font-bold">Booking overview</h1>
        {detail.confirmedAt && <p>Confirmed {formatRentalDate(detail.confirmedAt)} IST.</p>}
        <BookingSummary record={detail.record} showCustomer />
        <BookingReview bookingId={booking.id} state={booking.state} userId={detail.userId} role="admin" />
        <CancellationPanel bookingId={detail.record.booking.id} state={detail.record.booking.state} userId={detail.userId} role="admin" requests={detail.cancellations} total={detail.cancellationCount} />
        <section aria-label="Rental operations" className="space-y-4">
            <h2 className="text-xl font-semibold">Rental operations</h2>
            <p><Link className="link" href={`/admin/cars/edit/${vehicle.id}`}>{vehicle.fleet_code}</Link> · Vehicle condition: {vehicle.operational_state}</p>
            <p>Use the demo pickup location saved in the booking above. Ready applies to this booking only.</p>
            {booking.state === 'confirmed' && <OperationForm {...props} command="ready" />}
            {booking.state === 'ready' && <><p>Pickup window: {formatRentalDate(quote.starts_at)} – {formatRentalDate(quote.ends_at)} IST.</p>{pendingCancellation ? <p>Resolve the pending cancellation before recording pickup.</p> : <OperationForm {...props} command="pickup" />}</>}
            {booking.state === 'active' && <OperationForm {...props} command="return" minimumMileage={inspections.find(item => item.kind === 'pickup')?.odometer_km || 0} />}
            {booking.state === 'returned' && <><p>The vehicle is unavailable until return inspection and rental completion.</p><OperationForm {...props} command="inspect" /></>}
            {booking.state === 'inspection' && (cleared ? <><p>Inspection is cleared. Complete the rental to release this reservation. Turnaround and other reservations still apply.</p><OperationForm {...props} command="complete" /></> : <>{failed && <p>Maintenance is required. The vehicle remains unavailable until staff records inspection clearance.</p>}{!failed && <OperationForm {...props} command="fail" />}<OperationForm {...props} command="clear" /></>)}
            {booking.state === 'completed' && <p>Rental completed. Historical inspection evidence is retained. Current availability still depends on vehicle condition, turnaround, maintenance and reservations.</p>}
            {booking.state === 'cancelled' && <p>This booking is cancelled. Pickup and rental operations are unavailable.</p>}
        </section>
        {!!inspections.length && <section aria-label="Staff inspection records" className="space-y-4">
            <h2 className="text-xl font-semibold">Staff inspection records</h2>
            <p>Condition details, notes and photos in this section are private to staff.</p>
            {inspections.map(item => <article key={item.id} className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">{item.kind === 'pickup' ? 'Pickup' : 'Return'} record</h3>
                <p>{formatRentalDate(item.recorded_at)} IST · Staff {item.recorded_by}</p>
                <p>Mileage: {item.odometer_km} km · Fuel / charge: {item.fuel_percent}%</p>
                <p>Condition: {item.condition}</p><p>{item.kind === 'pickup' ? 'Existing damage' : 'Damage / changes'}: {item.damage || 'None recorded'}</p>
                <p className="whitespace-pre-wrap">Staff-only notes: {item.staff_notes || 'None recorded'}</p>
                {outcomes.filter(outcome => outcome.inspection_id === item.id).map(outcome => <div key={String(outcome.passed)} className="border-t pt-2">
                    <p>{outcome.passed ? 'Cleared' : 'Maintenance required'} · {formatRentalDate(outcome.inspected_at)} IST · Staff {outcome.inspected_by}</p><p className="whitespace-pre-wrap">Staff-only reason: {outcome.reason}</p>
                </div>)}
            </article>)}
            <InspectionMedia userId={detail.userId} inspections={inspections} media={operations.media} />
            <nav aria-label="Inspection photo pages" className="flex gap-4 items-center">
                {operations.mediaPage > 1 && <Link className="link" href={`?media=${operations.mediaPage - 1}`}>Previous photos</Link>}
                <span>{operations.mediaCount} photo records · Page {operations.mediaPage} of {operations.mediaPages}</span>
                {operations.mediaPage < operations.mediaPages && <Link className="link" href={`?media=${operations.mediaPage + 1}`}>Next photos</Link>}
            </nav>
        </section>}
        <BookingTimeline events={detail.events} page={detail.eventPage} pages={detail.eventPages} total={detail.eventCount} basePath={`/admin/bookings/${detail.record.booking.id}`} />
    </div>
}
