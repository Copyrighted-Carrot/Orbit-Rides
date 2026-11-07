import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { requireAccount } from '@/lib/auth/account'
import { validVehicleId } from '@/lib/fleet/search'

import { bookingVersions, hydrateBookings, type BookingRecord } from './history'
import { readConsistentBookings } from './read-consistency'

export type CheckoutRecord = BookingRecord & { serverNow: string }

export async function readCheckout(bookingId: string): Promise<CheckoutRecord | null> {
    const { user } = await requireAccount('customer')
    return readOwnedCheckout(user.id, bookingId)
}

export async function readOwnedCheckout(userId: string, bookingId: string): Promise<CheckoutRecord | null> {
    if (!validVehicleId(bookingId)) return null
    const client = await createClient<Database>()
    return readConsistentBookings(async () => {
        const { data: booking, error } = await client.from('bookings').select('*').eq('id', bookingId).eq('customer_id', userId).maybeSingle()
        if (error) throw new Error('Checkout could not be loaded.')
        if (!booking) return { value: null, bookings: [] }
        const [record] = await hydrateBookings(client, [booking])
        return { value: { ...record, serverNow: new Date().toISOString() }, bookings: [booking] }
    }, ids => bookingVersions(client, ids, userId))
}

export async function readOwnedPayment(userId: string, sessionId: string) {
    if (!validVehicleId(sessionId)) return null
    const client = await createClient<Database>()
    const { data, error } = await client.from('payment_sessions').select('booking_id').eq('id', sessionId).maybeSingle()
    if (error) throw new Error('Payment session could not be loaded.')
    return data ? readOwnedCheckout(userId, data.booking_id) : null
}
