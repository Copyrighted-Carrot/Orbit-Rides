import Link from 'next/link'
export default function MissingBooking() { return <div className="p-8 space-y-4"><h1 className="text-2xl">Booking unavailable</h1><p>This booking could not be found in your account.</p><Link className="btn" href="/customer/bookings">Booking history</Link></div> }
