'use server'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { textField } from '@/lib/auth/form'
import { validVehicleId } from '@/lib/fleet/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'

export type CancellationResult = { error?: string; message?: string }
export async function requestCancellation(_state: CancellationResult, form: FormData): Promise<CancellationResult> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before continuing.' }
    const booking = textField(form, 'booking_id'), request = textField(form, 'request_id'), reason = textField(form, 'reason').trim()
    if (!validVehicleId(booking) || !validVehicleId(request) || !reason || reason.length > 500) return { error: 'Provide a valid booking and a reason of up to 500 characters.' }
    const client = await createClient<Database>()
    const { error } = await client.rpc('request_cancellation', { p_booking_id: booking, p_request_id: request, p_reason: reason })
    if (error) return { error: 'Cancellation could not be requested. Reload its saved state; only confirmed or ready bookings before pickup are eligible.' }
    for (const path of ['/customer/bookings', '/admin/bookings', '/customer/notifications']) revalidatePath(path, 'layout')
    return { message: 'Cancellation requested. The reservation remains in place until the operator accepts it.' }
}
