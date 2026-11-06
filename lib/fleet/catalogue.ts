import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/clean.types'
import { PAGE_SIZE, parseSearchParams, validVehicleId } from './search'

export type FleetCard = {
    id: string; manufacturer: string; model: string; vehicle_type_id: string; type_name: string
    daily_rate_minor: number; currency: string; operational_state: string; cover_url: string | null
}
export type FleetMedia = { id: string; category: string; position: number; url: string | null }
export type PickupLocation = { name: string; city: string; address: string }

function record(value: Json | undefined): value is { [key: string]: Json | undefined } {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseCard(value: Json): Omit<FleetCard, 'cover_url'> & { cover_path: string | null } {
    if (!record(value) || typeof value.id !== 'string' || !validVehicleId(value.id)
        || typeof value.manufacturer !== 'string' || typeof value.model !== 'string'
        || typeof value.vehicle_type_id !== 'string' || typeof value.type_name !== 'string'
        || typeof value.daily_rate_minor !== 'number' || !Number.isSafeInteger(value.daily_rate_minor)
        || value.currency !== 'INR' || typeof value.operational_state !== 'string'
        || (value.cover_path !== null && typeof value.cover_path !== 'string')) throw new Error('The vehicle catalogue response was invalid.')
    return { id: value.id, manufacturer: value.manufacturer, model: value.model, vehicle_type_id: value.vehicle_type_id,
        type_name: value.type_name, daily_rate_minor: value.daily_rate_minor, currency: value.currency,
        operational_state: value.operational_state, cover_path: value.cover_path }
}

export async function getCatalogue(search: ReturnType<typeof parseSearchParams>) {
    if (search.error) throw new Error(search.error)
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('search_fleet', {
        p_starts_at: search.startsAt || undefined, p_ends_at: search.endsAt || undefined,
        p_query: search.filters.q, p_type_id: search.filters.type || undefined,
        p_max_rate_minor: search.maxRateMinor ?? undefined, p_page: search.filters.page, p_page_size: PAGE_SIZE,
    })
    if (error) throw new Error('The vehicle catalogue could not be loaded. Please retry.')
    if (!record(data) || !Array.isArray(data.vehicles) || typeof data.total !== 'number' || !Number.isSafeInteger(data.total)) {
        throw new Error('The vehicle catalogue response was invalid.')
    }
    const cards = data.vehicles.map(parseCard)
    const paths = cards.flatMap(card => card.cover_path ? [card.cover_path] : [])
    const signed = paths.length ? await client.storage.from('fleet-gallery').createSignedUrls(paths, 600) : null
    const urls = new Map(signed?.data?.map(item => [item.path, item.signedUrl]) || [])
    return {
        vehicles: cards.map(({ cover_path, ...card }): FleetCard => ({ ...card, cover_url: cover_path ? urls.get(cover_path) || null : null })),
        total: data.total, page: search.filters.page, pageSize: PAGE_SIZE,
        mediaWarning: Boolean(signed?.error || signed?.data?.some(item => item.error)),
    }
}

export async function getVehicleTypes() {
    const client = await createClient<Database>()
    const { data, error } = await client.from('vehicle_types').select('id,name').order('name').limit(100)
    if (error) throw new Error('Vehicle types could not be loaded. Please retry.')
    return data
}

export async function getPickupLocation(): Promise<PickupLocation | null> {
    const client = await createClient<Database>()
    const { data, error } = await client.from('pickup_location').select('name,city,address').eq('singleton', true).maybeSingle()
    if (error) throw new Error('Pickup information could not be loaded. Please retry.')
    return data
}

export async function getVehicle(id: string) {
    if (!validVehicleId(id)) return null
    const client = await createClient<Database>()
    const { data: vehicle, error } = await client.from('vehicles')
        .select('id,manufacturer,model,vehicle_type_id,daily_rate_minor,currency,operational_state')
        .eq('id', id).eq('published', true).neq('operational_state', 'archived').maybeSingle()
    if (error) throw new Error('Vehicle details could not be loaded. Please retry.')
    if (!vehicle) return null
    const [{ data: type, error: typeError }, { data: media, error: mediaError }] = await Promise.all([
        client.from('vehicle_types').select('name').eq('id', vehicle.vehicle_type_id).single(),
        client.from('vehicle_media').select('id,category,position,object_path')
            .eq('vehicle_id', id).eq('state', 'current').not('width', 'is', null).not('height', 'is', null)
            .order('category').order('position').limit(160),
    ])
    if (typeError || mediaError) throw new Error('Vehicle details could not be loaded. Please retry.')
    const signed = media.length ? await client.storage.from('fleet-gallery').createSignedUrls(media.map(item => item.object_path), 600) : null
    const urls = new Map(signed?.data?.map(item => [item.path, item.signedUrl]) || [])
    const gallery: FleetMedia[] = media.map(item => ({ id: item.id, category: item.category, position: item.position, url: urls.get(item.object_path) || null }))
    return { vehicle: { ...vehicle, type_name: type.name, cover_url: gallery.find(item => item.category === 'exterior')?.url || gallery[0]?.url || null } as FleetCard,
        gallery, mediaWarning: Boolean(signed?.error || signed?.data?.some(item => item.error)) }
}

export async function vehicleAvailable(id: string, startsAt: string, endsAt: string) {
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('available_vehicles', { p_starts_at: startsAt, p_ends_at: endsAt }).eq('vehicle_id', id)
    if (error) throw new Error('Availability could not be checked. Please retry.')
    return data.length === 1
}
