type BookingVersion = { id: string; state: string; updated_at: string }

// Payment/lifecycle commands update the booking in the same transaction. Recheck
// its exact version after assembling related records to avoid mixed-state reads.
export async function readConsistentBookings<T>(
    read: () => Promise<{ value: T; bookings: BookingVersion[] }>,
    verify: (ids: string[]) => Promise<BookingVersion[]>,
): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const { value, bookings } = await read()
        if (!bookings.length) return value
        const current = await verify(bookings.map(booking => booking.id))
        const versions = new Map(current.map(booking => [booking.id, booking]))
        if (current.length === bookings.length && bookings.every(booking => {
            const latest = versions.get(booking.id)
            return latest?.state === booking.state && latest.updated_at === booking.updated_at
        })) return value
    }
    throw new Error('The booking changed while loading. Please retry to see its current state.')
}
