import Link from 'next/link'
import { formatRentalDate } from '@/lib/fleet/search'
import { eventLabel, stateLabel, type BookingEvent } from '@/lib/booking/history'

export default function BookingTimeline({ events, page, pages, total, basePath }: { events: BookingEvent[]; page: number; pages: number; total: number; basePath: string }) {
    return <section className="space-y-4" aria-label="Booking timeline">
        <h2 className="text-2xl font-semibold">Booking timeline</h2>
        <p>{total} recorded events</p>
        {events.length ? <ol className="space-y-4">{events.map(event => <li key={event.id} className="border-l-2 pl-4 space-y-1" data-event-type={event.event_type}>
            <h3 className="font-semibold">{eventLabel(event.event_type)}</h3>
            <p>{event.reason}</p>{event.new_state && <p className="text-sm">{event.previous_state ? stateLabel(event.previous_state) : 'Created'} → {stateLabel(event.new_state)}</p>}
            <p className="text-sm"><time dateTime={event.occurred_at}>{formatRentalDate(event.occurred_at)} IST</time> · {event.actor_kind === 'admin' ? 'Operator' : event.actor_kind === 'customer' ? 'Customer' : 'System'}</p>
        </li>)}</ol> : <p role="status">No events on this page.</p>}
        <nav aria-label="Timeline pages" className="flex gap-4 items-center">
            {page > 1 && <Link className="btn btn-outline" href={`${basePath}?events=${page - 1}`}>Previous events</Link>}
            <span>Page {page} of {pages}</span>
            {page < pages && <Link className="btn btn-outline" href={`${basePath}?events=${page + 1}`}>Next events</Link>}
        </nav>
    </section>
}
