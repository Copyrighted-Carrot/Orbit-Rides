import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { readBookingDetail, bookingVersions } from './history'
import { readConsistentBookings } from './read-consistency'

export async function readOperationalBooking(bookingId: string, events?: string | string[], mediaPage?: string | string[]) {
    const client = await createClient<Database>()
    const page = typeof mediaPage === 'string' && /^[1-9]\d{0,4}$/.test(mediaPage) ? Number(mediaPage) : 1
    return readConsistentBookings(async () => {
        const detail = await readBookingDetail('admin', bookingId, events)
        const { booking } = detail.record
        const [vehicle, inspections] = await Promise.all([
            client.from('vehicles').select('id,fleet_code,operational_state').eq('id', booking.vehicle_id).single(),
            client.from('inspections').select('*').eq('booking_id', booking.id).order('recorded_at').limit(2),
        ])
        if (vehicle.error || inspections.error) throw new Error('Operational records could not be loaded. Please retry.')
        const ids = inspections.data.map(item => item.id)
        const [outcomes, media] = ids.length ? await Promise.all([
            client.from('inspection_outcomes').select('*').in('inspection_id', ids).order('inspected_at').limit(4),
            client.from('inspection_media').select('*', { count: 'exact' }).in('inspection_id', ids).order('created_at', { ascending: false }).order('id').range((page - 1) * 12, page * 12 - 1),
        ]) : [{ data: [], error: null }, { data: [], error: null, count: 0 }]
        if (outcomes.error || media.error) throw new Error('Inspection evidence could not be loaded. Please retry.')
        const images = await Promise.all(media.data.map(async item => {
            if (item.state !== 'attached') return { ...item, url: null }
            const signed = await client.storage.from('rental-inspections').createSignedUrl(item.object_path, 300)
            return { ...item, url: signed.error ? null : signed.data.signedUrl }
        }))
        return { bookings: [booking], value: { detail, vehicle: vehicle.data, inspections: inspections.data, outcomes: outcomes.data, media: images, mediaPage: page, mediaPages: Math.max(1, Math.ceil((media.count || 0) / 12)), mediaCount: media.count || 0 } }
    }, ids => bookingVersions(client, ids))
}
