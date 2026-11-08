import 'server-only'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/clean.types'
import { validVehicleId } from '@/lib/fleet/search'

export const ACTIVITY_PAGE_SIZE = 12
export function jsonRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function count(value: Json | undefined): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Activity response was invalid.')
    return value
}
export async function readActivitySummary() {
    await requireAccount('customer')
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('my_activity_summary')
    if (error || !jsonRecord(data)) throw new Error('Saved activity could not be loaded. Please retry.')
    return { saved: count(data.saved_count), recent: count(data.recent_count), reviews: count(data.review_count) }
}
export async function readSavedIds(ids: string[]) {
    const { user } = await requireAccount('customer')
    if (!ids.length) return new Set<string>()
    if (ids.length > 24 || ids.some(id => !validVehicleId(id))) throw new Error('Invalid vehicle selection.')
    const client = await createClient<Database>()
    const { data, error } = await client.from('wishlist').select('vehicle_id').eq('customer_id', user.id).in('vehicle_id', ids)
    if (error) throw new Error('Saved vehicles could not be loaded. Please retry.')
    return new Set(data.map(item => item.vehicle_id))
}
export type ActivityVehicle = {
    id: string; label: string; typeName: string | null; rate: number | null; visible: boolean
    condition: string | null; observedAt: string; coverUrl: string | null
}
export async function readVehicleActivity(kind: 'saved' | 'recent', page: number) {
    await requireAccount('customer')
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('my_vehicle_activity', { p_kind: kind, p_page: page })
    if (error || !jsonRecord(data) || !Array.isArray(data.items)) throw new Error('Saved activity could not be loaded. Please retry.')
    const total = count(data.total)
    const items = data.items.map(value => {
        if (!jsonRecord(value) || typeof value.vehicle_id !== 'string' || !validVehicleId(value.vehicle_id)
            || typeof value.observed_at !== 'string' || !Number.isFinite(Date.parse(value.observed_at))
            || typeof value.catalogue_visible !== 'boolean'
            || (value.daily_rate_minor !== null && (typeof value.daily_rate_minor !== 'number' || !Number.isSafeInteger(value.daily_rate_minor)))
            || (value.cover_path !== null && typeof value.cover_path !== 'string')) throw new Error('Activity response was invalid.')
        return { id: value.vehicle_id, label: typeof value.manufacturer === 'string' && typeof value.model === 'string' ? value.manufacturer + ' ' + value.model : 'Vehicle no longer in the catalogue',
            typeName: typeof value.type_name === 'string' ? value.type_name : null, rate: value.daily_rate_minor as number | null,
            visible: value.catalogue_visible, condition: typeof value.operational_state === 'string' ? value.operational_state : null,
            observedAt: value.observed_at, coverPath: value.cover_path as string | null }
    })
    const paths = items.flatMap(item => item.coverPath ? [item.coverPath] : [])
    const signed = paths.length ? await client.storage.from('fleet-gallery').createSignedUrls(paths, 600) : null
    const urls = new Map(signed?.data?.map(item => [item.path, item.signedUrl]) || [])
    return { total, items: items.map(({ coverPath, ...item }): ActivityVehicle => ({ ...item, coverUrl: coverPath ? urls.get(coverPath) || null : null })),
        mediaWarning: Boolean(signed?.error || signed?.data?.some(item => item.error)) }
}
export async function readOwnReviews(page: number) {
    const { user } = await requireAccount('customer')
    const client = await createClient<Database>()
    // RLS restricts review identities to the owning customer (or staff).
    const result = await client.from('reviews').select('booking_id,rating,comment,created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).order('booking_id').range((page - 1) * ACTIVITY_PAGE_SIZE, page * ACTIVITY_PAGE_SIZE - 1)
    if (result.error) throw new Error('Your reviews could not be loaded. Please retry.')
    if (!result.data.length) return { items: [], total: result.count || 0 }
    const bookings = await client.from('bookings').select('id,reference,quote_id').eq('customer_id', user.id)
        .eq('state', 'completed').in('id', result.data.map(item => item.booking_id))
    if (bookings.error) throw new Error('Review bookings could not be loaded. Please retry.')
    const quotes = await client.from('quotes').select('id,vehicle_label').eq('customer_id', user.id).in('id', bookings.data.map(item => item.quote_id))
    if (quotes.error) throw new Error('Review history could not be loaded. Please retry.')
    const bookingMap = new Map(bookings.data.map(item => [item.id, item]))
    const quoteMap = new Map(quotes.data.map(item => [item.id, item]))
    const items = result.data.map(item => {
        const booking = bookingMap.get(item.booking_id), quote = booking && quoteMap.get(booking.quote_id)
        if (!booking || !quote) throw new Error('A review could not be matched to its completed rental.')
        return { ...item, reference: booking.reference, vehicleLabel: quote.vehicle_label }
    })
    return { items, total: result.count || 0 }
}
