'use server'

import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { validVehicleId } from '@/lib/fleet/search'

export type InspectionMediaResult = { error?: string; message?: string; success?: boolean }

async function staffClient(expectedUserId: string) {
    const { user } = await requireAccount('admin')
    if (user.id !== expectedUserId) return null
    return createClient<Database>()
}

export async function prepareInspectionUpload(userId: string, input: { inspectionId: string; contentType: string; byteLength: number }) {
    const client = await staffClient(userId)
    if (!client) return { error: 'Your account changed. Reload before continuing.' }
    if (!input || !validVehicleId(input.inspectionId) || !['image/jpeg', 'image/png', 'image/webp'].includes(input.contentType) || !Number.isInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > 8388608) return { error: 'Choose a still JPEG, PNG or WebP image up to 8 MiB.' }
    const { data, error } = await client.rpc('prepare_inspection_media', { p_inspection_id: input.inspectionId, p_content_type: input.contentType, p_byte_length: input.byteLength })
    if (error) return { error: 'The inspection upload could not be prepared. Reload and retry.' }
    revalidatePath('/admin/bookings', 'layout')
    return { media: { id: data.id, object_path: data.object_path } }
}

export async function attachInspectionUpload(userId: string, mediaId: string): Promise<InspectionMediaResult> {
    const client = await staffClient(userId)
    if (!client) return { error: 'Your account changed. Reload before continuing.' }
    if (!validVehicleId(mediaId)) return { error: 'Invalid inspection photo reference.' }
    const { data: media, error } = await client.from('inspection_media').select('id,state').eq('id', mediaId).maybeSingle()
    if (error || !media) return { error: 'The inspection upload could not be loaded.' }
    if (media.state === 'discarded') return { error: 'This upload is marked for cleanup.' }
    if (media.state !== 'attached') {
        const validation = await client.functions.invoke('validate-media', { body: { media_id: mediaId, inspection: true } })
        if (validation.error) return { error: 'Image validation failed. Retry validation or clean up the unfinished upload.' }
        const attached = await client.rpc('attach_inspection_media', { p_media_id: mediaId })
        if (attached.error) return { error: 'The validated photo could not be attached. Reload and retry validation.' }
    }
    revalidatePath('/admin/bookings', 'layout')
    return { success: true, message: 'Inspection photo attached. It is visible only to staff and retained with this inspection.' }
}

export async function discardInspectionUpload(userId: string, mediaId: string): Promise<InspectionMediaResult> {
    const client = await staffClient(userId)
    if (!client) return { error: 'Your account changed. Reload before continuing.' }
    if (!validVehicleId(mediaId)) return { error: 'Invalid inspection photo reference.' }
    const { data: media, error } = await client.from('inspection_media').select('id,state,object_path').eq('id', mediaId).maybeSingle()
    if (error) return { error: 'The unfinished upload could not be loaded. Retry cleanup.' }
    if (!media) return { success: true, message: 'Upload cleanup is complete.' }
    if (!['pending', 'discarded'].includes(media.state)) return { error: 'Attached inspection evidence cannot be removed by upload cleanup.' }
    const discarded = await client.rpc('discard_inspection_upload', { p_media_id: mediaId })
    if (discarded.error) return { error: 'The upload could not be marked for cleanup. Reload and retry.' }
    const removed = await client.storage.from('rental-inspections').remove([media.object_path])
    if (removed.error) return { error: 'File cleanup is pending. Retry cleanup from the inspection photos.' }
    const finished = await client.rpc('finish_discarded_upload', { p_media_id: mediaId, p_inspection: true })
    if (finished.error) return { error: 'The file was removed. Retry cleanup to finish the inspection association.' }
    revalidatePath('/admin/bookings', 'layout')
    return { success: true, message: 'Unfinished inspection upload removed.' }
}
