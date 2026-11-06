'use server'

import { revalidatePath } from 'next/cache'
import { adminClient, isVehicleId, mediaColumns, type FleetFormState } from '@/lib/fleet/admin'

function invalidateFleet(vehicleId?: string) {
    revalidatePath('/admin/cars', 'layout')
    revalidatePath('/customer/cars', 'layout')
    revalidatePath('/')
    if (vehicleId) revalidatePath(`/customer/cars/${vehicleId}`)
}

function readCatalogue(form: FormData) {
    const text = (name: string) => typeof form.get(name) === 'string' ? (form.get(name) as string).trim() : ''
    const manufacturer = text('manufacturer'), model = text('model'), typeId = text('vehicle_type_id'), rate = text('daily_rate')
    if (!manufacturer || manufacturer.length > 80 || !model || model.length > 100 || !isVehicleId(typeId) || !/^\d{1,7}(\.\d{1,2})?$/.test(rate)) return null
    const [whole, fraction = ''] = rate.split('.')
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    if (!Number.isSafeInteger(minor) || minor < 1 || minor > 100000000 || /[\u0000-\u001f]/.test(manufacturer + model)) return null
    return { manufacturer, model, typeId, minor }
}

export async function saveVehicle(vehicleId: string | null, form: FormData): Promise<FleetFormState> {
    const client = await adminClient()
    const values = readCatalogue(form)
    if (!values) return { error: 'Enter a manufacturer, model, vehicle type and a daily rate from ₹0.01 to ₹10,00,000 with at most two decimal places.' }
    const args = { p_vehicle_type_id: values.typeId, p_manufacturer: values.manufacturer, p_model: values.model, p_daily_rate_minor: values.minor }
    if (vehicleId !== null) {
        if (!isVehicleId(vehicleId)) return { error: 'Invalid vehicle reference.' }
        const { error } = await client.rpc('update_vehicle_catalogue', { ...args, p_vehicle_id: vehicleId })
        if (error) return { error: 'Vehicle details could not be saved. Check that the vehicle is not archived and retry.' }
        invalidateFleet(vehicleId)
        return { success: true, id: vehicleId, message: 'Vehicle details saved. Existing rental quotes retain their original details and prices.' }
    }
    const code = typeof form.get('fleet_code') === 'string' ? (form.get('fleet_code') as string).trim().toUpperCase() : ''
    if (!/^[A-Z0-9-]{2,30}$/.test(code)) return { error: 'Use a unique fleet code of 2–30 letters, numbers or hyphens.' }
    const { data, error } = await client.rpc('create_vehicle', { ...args, p_fleet_code: code })
    if (error) return { error: error.code === '23505' ? 'That fleet code already exists. Open the existing vehicle instead of creating it again.' : 'The vehicle could not be created. Please retry.' }
    invalidateFleet(data)
    return { success: true, id: data }
}

export async function setVehiclePublication(vehicleId: string, published: boolean): Promise<FleetFormState> {
    const client = await adminClient()
    if (!isVehicleId(vehicleId) || typeof published !== 'boolean') return { error: 'Invalid publication request.' }
    const { error } = await client.rpc('set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: published })
    if (error) return { error: 'Publication could not be changed. Archived vehicles cannot be published.' }
    invalidateFleet(vehicleId)
    return { success: true, message: published ? 'Vehicle published. Availability still depends on reservations and operational condition.' : 'Vehicle hidden from new discovery. Existing rentals remain unchanged.' }
}

export async function archiveVehicle(vehicleId: string): Promise<FleetFormState> {
    const client = await adminClient()
    if (!isVehicleId(vehicleId)) return { error: 'Invalid vehicle reference.' }
    const { error } = await client.rpc('archive_vehicle', { p_vehicle_id: vehicleId })
    if (error) return { error: error.code === '55000' ? 'Finish or accept cancellation of outstanding reservations before archiving this vehicle.' : 'This vehicle could not be archived. Please retry.' }
    invalidateFleet(vehicleId)
    return { success: true, message: 'Vehicle archived. Historical rentals and media remain intact.' }
}

export async function prepareGalleryUpload(input: { vehicleId: string; category: string; position: number; contentType: string; byteLength: number }) {
    const client = await adminClient()
    if (!input || !isVehicleId(input.vehicleId) || !['exterior', 'interior', 'cockpit', 'rear', 'detail'].includes(input.category) || !Number.isInteger(input.position) || input.position < 0 || input.position > 31 || !['image/jpeg', 'image/png', 'image/webp'].includes(input.contentType) || !Number.isInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > 8388608) return { error: 'Choose a still JPEG, PNG or WebP image up to 8 MiB and a valid gallery slot.' }
    const { data, error } = await client.rpc('prepare_vehicle_media', { p_vehicle_id: input.vehicleId, p_category: input.category, p_position: input.position, p_content_type: input.contentType, p_byte_length: input.byteLength })
    if (error) return { error: 'The upload could not be prepared. Refresh the gallery before retrying.' }
    return { media: { id: data.id, object_path: data.object_path } }
}

export async function publishGalleryMedia(mediaId: string): Promise<FleetFormState> {
    const client = await adminClient()
    if (!isVehicleId(mediaId)) return { error: 'Invalid media reference.' }
    const { data: media, error: readError } = await client.from('vehicle_media').select(mediaColumns).eq('id', mediaId).maybeSingle()
    if (readError || !media) return { error: 'The gallery item could not be loaded.' }
    if (media.state === 'discarded') return { error: 'This upload is marked for cleanup and cannot be published.' }
    const { error: validationError } = await client.functions.invoke('validate-media', { body: { media_id: media.id, inspection: false } })
    if (validationError) return { error: 'The image could not be validated. Use a complete still JPEG, PNG or WebP within the size limits. You can retry validation or discard this upload.' }
    const { error } = await client.rpc('publish_vehicle_media', { p_media_id: media.id })
    if (error) return { error: 'The image was validated but could not be published. Refresh and retry; the previous gallery version is retained.' }
    invalidateFleet(media.vehicle_id)
    return { success: true, message: 'Gallery image published. The previous version remains available to restore.' }
}

export async function retireGalleryMedia(mediaId: string): Promise<FleetFormState> {
    const client = await adminClient()
    if (!isVehicleId(mediaId)) return { error: 'Invalid media reference.' }
    const { error } = await client.rpc('retire_vehicle_media', { p_media_id: mediaId })
    if (error) return { error: 'This gallery image could not be removed. Please refresh and retry.' }
    invalidateFleet()
    return { success: true, message: 'Image removed from the gallery. Its retained version can be restored.' }
}

export async function discardGalleryUpload(mediaId: string): Promise<FleetFormState> {
    const client = await adminClient()
    if (!isVehicleId(mediaId)) return { error: 'Invalid media reference.' }
    const { data: media, error: readError } = await client.from('vehicle_media').select(mediaColumns).eq('id', mediaId).maybeSingle()
    if (readError) return { error: 'The upload could not be loaded. Please retry cleanup.' }
    if (!media) return { success: true, message: 'Upload cleanup is complete.' }
    if (!['pending', 'discarded'].includes(media.state)) return { error: 'Published and retained gallery images cannot be deleted by upload cleanup.' }
    const { error: discardError } = await client.rpc('discard_vehicle_upload', { p_media_id: media.id })
    if (discardError) return { error: 'The unfinished upload could not be marked for cleanup. Please retry.' }
    const { error: storageError } = await client.storage.from('fleet-gallery').remove([media.object_path])
    if (storageError) return { error: 'Cleanup is pending: the file could not be removed. Retry cleanup from this gallery.' }
    const { error: finishError } = await client.rpc('finish_discarded_upload', { p_media_id: media.id, p_inspection: false })
    if (finishError) return { error: 'The file was removed but cleanup must be retried to finish its gallery record.' }
    invalidateFleet(media.vehicle_id)
    return { success: true, message: 'Unfinished upload removed.' }
}
