import Link from 'next/link'
import { eventLabel, readNotifications, type SearchValues } from '@/lib/booking/history'
import { formatRentalDate } from '@/lib/fleet/search'
import MarkReadButton from './MarkReadButton'

export const metadata = { title: 'Notifications | Orbit Rides', robots: { index: false, follow: false } }

export default async function Notifications({ searchParams }: { searchParams: Promise<SearchValues> }) {
    const inbox = await readNotifications(await searchParams)
    const pageLink = (page: number) => '/customer/notifications?' + new URLSearchParams({ page: String(page), view: inbox.unreadOnly ? 'unread' : 'all' })
    return <div className="max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p role="status">{inbox.unread} unread notifications</p>
        <nav aria-label="Notification filters" className="flex flex-wrap gap-4"><Link className="link" href="/customer/notifications" aria-current={!inbox.unreadOnly ? 'page' : undefined}>All</Link><Link className="link" href="/customer/notifications?view=unread" aria-current={inbox.unreadOnly ? 'page' : undefined}>Unread</Link><Link className="link" href="/customer/bookings">Booking history</Link></nav>
        {inbox.items.length ? <ol className="space-y-4">{inbox.items.map(item => <li key={item.event_id} className="border rounded-lg p-5 space-y-3" data-notification-event={item.event_id}>
            <h2 className="text-lg font-semibold">{eventLabel(item.event.event_type)}</h2>
            <p>{item.event.reason}</p><p className="font-mono break-all">{item.bookingReference}</p>
            <p className="text-sm"><time dateTime={item.created_at}>{formatRentalDate(item.created_at)} IST</time> · {item.read_at ? 'Read' : 'Unread'}</p>
            <div className="flex gap-4 flex-wrap items-center"><Link className="link" href={`/customer/bookings/${item.event.booking_id}`}>View booking</Link>{!item.read_at && <MarkReadButton eventId={item.event_id} userId={inbox.userId} />}</div>
        </li>)}</ol> : <p role="status">{inbox.unreadOnly ? 'No unread notifications on this page.' : 'No notifications on this page.'}</p>}
        <nav aria-label="Notification pages" className="flex gap-4 items-center">{inbox.page > 1 && <Link className="btn btn-outline" href={pageLink(inbox.page - 1)}>Previous</Link>}<span>Page {inbox.page} of {inbox.pages}</span>{inbox.page < inbox.pages && <Link className="btn btn-outline" href={pageLink(inbox.page + 1)}>Next</Link>}</nav>
    </div>
}
