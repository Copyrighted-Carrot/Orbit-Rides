import 'server-only'
import { notFound } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'

export type FleetVehicle = Database['public']['Tables']['vehicles']['Row']
export type FleetType = Pick<Database['public']['Tables']['vehicle_types']['Row'], 'id' | 'name'>
export type GalleryMedia = Pick<Database['public']['Tables']['vehicle_media']['Row'], 'id' | 'vehicle_id' | 'category' | 'position' | 'object_path' | 'content_type' | 'byte_length' | 'state'> & { url: string | null }
export type FleetFormState = { error?: string; success?: boolean; id?: string; message?: string }
export const vehicleColumns = 'id,fleet_code,vehicle_type_id,manufacturer,model,daily_rate_minor,currency,published,operational_state,created_at' as const
export const mediaColumns = 'id,vehicle_id,category,position,object_path,content_type,byte_length,state' as const
export const isVehicleId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
export const pageNumber = (value?: string) => value && /^\d{1,5}$/.test(value) ? Math.max(1, Math.min(Number(value), 10000)) : 1

export async function adminClient() {
    await requireAccount('admin')
    return createClient<Database>()
}

export async function readVehicleTypes() {
    const client = await adminClient()
    const { data, error } = await client.from('vehicle_types').select('id,name').order('name').limit(100)
    if (error) throw new Error('Vehicle types could not be loaded. Please retry.')
    return data
}

export async function readAdminVehicle(id: string) {
    const client = await adminClient()
    if (!isVehicleId(id)) notFound()
    const { data, error } = await client.from('vehicles').select(vehicleColumns).eq('id', id).maybeSingle()
    if (error) throw new Error('Vehicle details could not be loaded. Please retry.')
    if (!data) notFound()
    return data
}

export async function readAdminFleet(params: { q?: string; status?: string; type?: string; page?: string }) {
    const client = await adminClient()
    const page = pageNumber(params.page)
    const search = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 80)
    const status = ['published', 'draft', 'maintenance', 'inspection', 'archived'].includes(params.status || '') ? params.status! : 'all'
    const type = isVehicleId(params.type) ? params.type : ''
    const size = 12
    let query = client.from('vehicles').select(vehicleColumns, { count: 'exact' })
    // Only search text enters PostgREST's OR expression; strip its grammar characters.
    const safeSearch = search.replace(/[^\p{L}\p{N} -]/gu, '').trim()
    if (safeSearch) query = query.or(`manufacturer.ilike.%${safeSearch}%,model.ilike.%${safeSearch}%,fleet_code.ilike.%${safeSearch}%`)
    if (type) query = query.eq('vehicle_type_id', type)
    if (status === 'published') query = query.eq('published', true)
    else if (status === 'draft') query = query.eq('published', false).neq('operational_state', 'archived')
    else if (status !== 'all') query = query.eq('operational_state', status)
    const { data, error, count } = await query.order('fleet_code').order('id').range((page - 1) * size, page * size - 1)
    if (error) throw new Error('The fleet could not be loaded. Please retry.')
    return { vehicles: data, total: count || 0, page, pages: Math.max(1, Math.ceil((count || 0) / size)), search, status, type }
}

export async function readAdminMedia(vehicleId: string, params: { state?: string; page?: string }) {
    const client = await adminClient()
    const state = ['current', 'pending', 'retired', 'discarded'].includes(params.state || '') ? params.state! : 'all'
    const page = pageNumber(params.page)
    const size = 12
    let query = client.from('vehicle_media').select(mediaColumns, { count: 'exact' }).eq('vehicle_id', vehicleId)
    if (state !== 'all') query = query.eq('state', state)
    const { data, count, error } = await query.order('category').order('position').order('id').range((page - 1) * size, page * size - 1)
    if (error) throw new Error('Vehicle media could not be loaded. Please retry.')
    const media: GalleryMedia[] = await Promise.all(data.map(async item => {
        if (item.state === 'pending' || item.state === 'discarded') return { ...item, url: null }
        const signed = await client.storage.from('fleet-gallery').createSignedUrl(item.object_path, 600)
        return { ...item, url: signed.error ? null : signed.data.signedUrl }
    }))
    return { media, total: count || 0, page, pages: Math.max(1, Math.ceil((count || 0) / size)), state }
}
