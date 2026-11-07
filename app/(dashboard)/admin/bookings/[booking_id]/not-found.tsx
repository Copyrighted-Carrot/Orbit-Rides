import Link from 'next/link'
export default function MissingBooking() { return <div className="p-8 space-y-4"><h1 className="text-2xl">Booking unavailable</h1><p>No booking matches this reference.</p><Link className="btn" href="/admin/bookings">Booking overview</Link></div> }
