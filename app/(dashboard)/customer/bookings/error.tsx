'use client'

export default function BookingError() {
    return <div className="p-8 space-y-5"><div role="alert"><h2 className="text-2xl font-semibold">Bookings could not be loaded</h2><p>Please retry to load the current booking records.</p></div><button className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div>
}
