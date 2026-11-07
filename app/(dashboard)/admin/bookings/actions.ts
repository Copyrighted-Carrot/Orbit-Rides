'use server'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { textField } from '@/lib/auth/form'
import { validVehicleId } from '@/lib/fleet/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import type { CancellationResult } from '../../customer/bookings/actions'

export async function decideCancellation(_state: CancellationResult, form: FormData): Promise<CancellationResult> {
    const { user } = await requireAccount('admin')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before continuing.' }
    const request = textField(form, 'request_id'), decision = textField(form, 'decision'), reason = textField(form, 'reason').trim()
    if (!validVehicleId(request) || !['accept', 'reject'].includes(decision) || !reason || reason.length > 500) return { error: 'Provide a decision and customer-visible reason of up to 500 characters.' }
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('decide_cancellation', { p_request_id: request, p_accept: decision === 'accept', p_reason: reason })
    if (error) return { error: 'Decision could not be recorded. Reload to check whether another decision or transition already occurred.' }
    for (const path of ['/customer/bookings', '/admin/bookings', '/customer/notifications', '/customer/profile', '/customer/cars']) revalidatePath(path, 'layout')
    return { message: `Cancellation ${data}. Demo payments involve no transfer or refund.` }
}
