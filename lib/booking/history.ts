import 'server-only'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/clean.types'
import { validVehicleId } from '@/lib/fleet/search'
import { readConsistentBookings } from './read-consistency'

type Tables = Database['public']['Tables']
type Booking = Tables['bookings']['Row']
export type BookingEvent = Tables['booking_events']['Row']
export type QuoteSnapshot = Tables['quotes']['Row']
export type PaymentSummary = Tables['payment_sessions']['Row']
export type BookingRecord = { booking: Booking; quote: QuoteSnapshot; payment: PaymentSummary }
export type SearchValues = Record<string, string | string[] | undefined>
export const BOOKING_STATES = ['held', 'awaiting_confirmation', 'confirmed', 'ready', 'active', 'returned', 'inspection', 'completed', 'expired', 'cancelled', 'failed'] as const
const PAGE_SIZE = 12
const EVENT_PAGE_SIZE = 30
const quoteColumns = '*' as const
const paymentColumns = '*' as const
const eventColumns = 'id,booking_id,event_type,actor_kind,actor_id,reason,occurred_at' as const
const bookingColumns = 'id,reference,quote_id,vehicle_id,customer_id,state,hold_expires_at,created_at,updated_at' as const

export function stateLabel(state: string) {
    const labels: Record<string, string> = { held: 'On hold', awaiting_confirmation: 'Awaiting confirmation', confirmed: 'Confirmed', ready: 'Ready for pickup', active: 'Active rental', returned: 'Returned', inspection: 'Under inspection', completed: 'Completed', expired: 'Expired', cancelled: 'Cancelled', failed: 'Failed', pending: 'Pending', succeeded: 'Succeeded' }
    return labels[state] || state.replaceAll('_', ' ')
}

export function eventLabel(event: string) {
    const labels: Record<string, string> = { hold_created: 'Reservation hold created', payment_pending: 'Demo payment pending', payment_succeeded: 'Demo payment approved', payment_failed: 'Demo payment failed', payment_expired: 'Demo payment expired', payment_cancelled: 'Demo payment cancelled', confirmed: 'Booking confirmed', ready: 'Vehicle ready', picked_up: 'Vehicle picked up', active: 'Rental active', returned: 'Vehicle returned', inspection_started: 'Inspection started', inspection_completed: 'Inspection completed', completed: 'Rental completed', cancel_requested: 'Cancellation requested', cancel_rejected: 'Cancellation rejected', cancellation_rejected: 'Cancellation rejected', cancelled: 'Booking cancelled', hold_expired: 'Reservation hold expired' }
    return labels[event] || event.replaceAll('_', ' ')
}

export function pickupSnapshot(value: Json | null): { name: string; city: string } | null {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.name !== 'string' || typeof value.city !== 'string') return null
    return { name: value.name, city: value.city }
}

function pageValue(value: SearchValues[string]) {
    return typeof value === 'string' && /^[1-9]\d{0,4}$/.test(value) ? Number(value) : 1
}

export function parseHistorySearch(params: SearchValues) {
    const q = typeof params.q === 'string' ? params.q.trim() : ''
    const state = typeof params.state === 'string' ? params.state : 'all'
    const page = pageValue(params.page)
    let error: string | null = null
    if (['q', 'state', 'page'].some(key => Array.isArray(params[key]))) error = 'Use one value for each history filter.'
    else if (q && !/^[A-Za-z0-9-]{1,80}$/.test(q)) error = 'Search using letters, numbers or hyphens from a booking reference.'
    else if (state !== 'all' && !BOOKING_STATES.some(item => item === state)) error = 'Choose a valid booking state.'
    else if (params.page && (typeof params.page !== 'string' || !/^[1-9]\d{0,4}$/.test(params.page))) error = 'Choose a valid results page.'
    return { q, state, page, error }
}

export async function hydrateBookings(client: Awaited<ReturnType<typeof createClient<Database>>>, bookings: Booking[]): Promise<BookingRecord[]> {
    if (!bookings.length) return []
    const [quotes, sessions] = await Promise.all([
        client.from('quotes').select(quoteColumns).in('id', bookings.map(booking => booking.quote_id)),
        client.from('payment_sessions').select(paymentColumns).in('booking_id', bookings.map(booking => booking.id)),
    ])
    if (quotes.error || sessions.error) throw new Error('Booking details could not be loaded. Please retry.')
    const quoteMap = new Map(quotes.data.map(quote => [quote.id, quote]))
    const paymentMap = new Map(sessions.data.map(payment => [payment.booking_id, payment]))
    return bookings.map(booking => {
        const quote = quoteMap.get(booking.quote_id), payment = paymentMap.get(booking.id)
        if (!quote || !payment || quote.total_minor === null || quote.customer_id !== booking.customer_id || quote.vehicle_id !== booking.vehicle_id || payment.amount_minor !== quote.total_minor || payment.currency !== quote.currency) {
            throw new Error('The stored booking information is incomplete. Please retry or contact the operator.')
        }
        return { booking, quote, payment }
    })
}

export async function bookingVersions(client: Awaited<ReturnType<typeof createClient<Database>>>, ids: string[], customerId?: string) {
    let query = client.from('bookings').select('id,state,updated_at').in('id', ids)
    if (customerId) query = query.eq('customer_id', customerId)
    const { data, error } = await query
    if (error) throw new Error('The booking state could not be verified. Please retry.')
    return data
}
export async function readBookingHistory(role: 'customer' | 'admin', params: SearchValues) {
    const { user } = await requireAccount(role)
    const client = await createClient<Database>()
    const filters = parseHistorySearch(params)
    if (filters.error) return { records: [] as BookingRecord[], total: 0, pages: 1, filters }
    return readConsistentBookings(async () => {
        let query = client.from('bookings').select(bookingColumns, { count: 'exact' })
        if (role === 'customer') query = query.eq('customer_id', user.id)
        if (filters.state !== 'all') query = query.eq('state', filters.state)
        if (filters.q) query = query.ilike('reference', `%${filters.q}%`)
        const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1)
        if (error) throw new Error('Booking history could not be loaded. Please retry.')
        return { bookings: data, value: { records: await hydrateBookings(client, data), total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)), filters } }
    }, ids => bookingVersions(client, ids, role === 'customer' ? user.id : undefined))
}

export async function readBookingDetail(role: 'customer' | 'admin', bookingId: string, timelinePage?: SearchValues[string]) {
    const { user } = await requireAccount(role)
    if (!validVehicleId(bookingId)) notFound()
    const client = await createClient<Database>()
    return readConsistentBookings(async () => {
        let query = client.from('bookings').select(bookingColumns).eq('id', bookingId)
        if (role === 'customer') query = query.eq('customer_id', user.id)
        const { data: booking, error } = await query.maybeSingle()
        if (error) throw new Error('This booking could not be loaded. Please retry.')
        if (!booking) notFound()
        const page = pageValue(timelinePage)
        const [records, events, confirmation] = await Promise.all([
            hydrateBookings(client, [booking]),
            client.from('booking_events').select(eventColumns, { count: 'exact' }).eq('booking_id', booking.id).order('id').range((page - 1) * EVENT_PAGE_SIZE, page * EVENT_PAGE_SIZE - 1),
            client.from('booking_events').select('occurred_at').eq('booking_id', booking.id).eq('event_type', 'confirmed').maybeSingle(),
        ])
        if (events.error || confirmation.error) throw new Error('The booking timeline could not be loaded. Please retry.')
        return { bookings: [booking], value: { record: records[0], events: events.data, confirmedAt: confirmation.data?.occurred_at || null, eventPage: page, eventPages: Math.max(1, Math.ceil((events.count || 0) / EVENT_PAGE_SIZE)), eventCount: events.count || 0 } }
    }, ids => bookingVersions(client, ids, role === 'customer' ? user.id : undefined))
}

export type NotificationItem = Tables['notifications']['Row'] & { event: BookingEvent; bookingReference: string }

export async function readNotifications(params: SearchValues) {
    const { user } = await requireAccount('customer')
    const client = await createClient<Database>()
    const page = pageValue(params.page), unreadOnly = params.view === 'unread'
    let query = client.from('notifications').select('event_id,customer_id,created_at,read_at', { count: 'exact' }).eq('customer_id', user.id)
    if (unreadOnly) query = query.is('read_at', null)
    const [result, unread] = await Promise.all([
        query.order('created_at', { ascending: false }).order('event_id', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
        client.from('notifications').select('event_id', { count: 'exact', head: true }).eq('customer_id', user.id).is('read_at', null),
    ])
    if (result.error || unread.error) throw new Error('Notifications could not be loaded. Please retry.')
    let items: NotificationItem[] = []
    if (result.data.length) {
        const events = await client.from('booking_events').select(eventColumns).in('id', result.data.map(item => item.event_id))
        if (events.error) throw new Error('Notification events could not be loaded. Please retry.')
        const bookings = await client.from('bookings').select('id,reference').eq('customer_id', user.id).in('id', [...new Set(events.data.map(event => event.booking_id))])
        if (bookings.error) throw new Error('Notification bookings could not be loaded. Please retry.')
        const eventMap = new Map(events.data.map(event => [event.id, event]))
        const references = new Map(bookings.data.map(booking => [booking.id, booking.reference]))
        items = result.data.map(item => {
            const event = eventMap.get(item.event_id), bookingReference = event && references.get(event.booking_id)
            if (!event || !bookingReference) throw new Error('A notification could not be matched to its booking. Please retry.')
            return { ...item, event, bookingReference }
        })
    }
    return { userId: user.id, items, page, pages: Math.max(1, Math.ceil((result.count || 0) / PAGE_SIZE)), total: result.count || 0, unread: unread.count || 0, unreadOnly }
}
