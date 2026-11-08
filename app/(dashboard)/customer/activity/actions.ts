'use server'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { textField } from '@/lib/auth/form'
import { validVehicleId } from '@/lib/fleet/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'

export type ActivityResult = { ok?: boolean; error?: string }
export async function saveVehicle(form: FormData): Promise<ActivityResult> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before continuing.' }
    const id = textField(form, 'vehicle_id'), saved = textField(form, 'saved')
    if (!validVehicleId(id) || !['true', 'false'].includes(saved)) return { error: 'Choose a valid vehicle and save action.' }
    const client = await createClient<Database>()
    const { error } = await client.rpc('set_wishlist', { p_vehicle_id: id, p_saved: saved === 'true' })
    if (error) return { error: 'Your saved vehicles could not be updated. Reload the saved state before retrying. Only published vehicles can be added.' }
    for (const path of ['/customer/activity', '/customer/profile', '/customer/cars']) revalidatePath(path, 'layout')
    return { ok: true }
}
export async function recordView(userId: string, vehicleId: string): Promise<ActivityResult> {
    const { user } = await requireAccount('customer')
    if (userId !== user.id) return { error: 'Your account changed. Reload before recording this view.' }
    if (!validVehicleId(vehicleId)) return { error: 'Invalid vehicle reference.' }
    const client = await createClient<Database>()
    const { error } = await client.rpc('record_vehicle_view', { p_vehicle_id: vehicleId })
    if (error) return { error: 'This view could not be saved to your recent activity.' }
    revalidatePath('/customer/activity'); revalidatePath('/customer/profile')
    return { ok: true }
}
export async function submitRentalReview(form: FormData): Promise<ActivityResult> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before submitting a review.' }
    const booking = textField(form, 'booking_id'), rating = textField(form, 'rating'), comment = textField(form, 'comment').trim()
    if (!validVehicleId(booking) || !/^[1-5]$/.test(rating) || !comment || comment.length > 1000) return { error: 'Choose a rating from 1 to 5 and write a review of up to 1,000 characters.' }
    const client = await createClient<Database>()
    // The command derives customer and vehicle from the authenticated, completed booking.
    const { error } = await client.rpc('submit_review', { p_booking_id: booking, p_rating: Number(rating), p_comment: comment })
    if (error) return { error: error.code === '23505' ? 'This rental already has a review. Reload to see the saved review.' : 'The review could not be saved. Only your completed rentals without a review are eligible. Reload and retry.' }
    for (const path of ['/customer/activity', '/customer/profile', '/customer/cars', '/customer/compare', '/customer/bookings', '/admin/bookings', '/admin/cars']) revalidatePath(path, 'layout')
    return { ok: true }
}
