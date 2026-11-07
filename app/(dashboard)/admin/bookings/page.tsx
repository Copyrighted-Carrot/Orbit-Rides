import { BookingHistoryView } from '@/app/components/BookingSummary'
import { readBookingHistory, type SearchValues } from '@/lib/booking/history'

export const metadata = { title: 'Booking overview | Orbit Rides', robots: { index: false, follow: false } }
export default async function AdminBookings({ searchParams }: { searchParams: Promise<SearchValues> }) {
    return <BookingHistoryView result={await readBookingHistory('admin', await searchParams)} role="admin" />
}
