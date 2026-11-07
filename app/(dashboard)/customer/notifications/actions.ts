'use server'

import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { textField } from '@/lib/auth/form'

export type NotificationResult = { error?: string; success?: boolean }

export async function markRead(_state: NotificationResult, form: FormData): Promise<NotificationResult> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload notifications before trying again.' }
    const rawId = textField(form, 'event_id'), eventId = Number(rawId)
    if (!/^[1-9]\d{0,15}$/.test(rawId) || !Number.isSafeInteger(eventId)) return { error: 'Invalid notification reference.' }
    const client = await createClient<Database>()
    const { data: notification, error: readError } = await client.from('notifications').select('event_id').eq('event_id', eventId).eq('customer_id', user.id).maybeSingle()
    if (readError) return { error: 'The notification could not be loaded. Please retry.' }
    if (!notification) return { error: 'This notification is unavailable in your account.' }
    const { error } = await client.rpc('mark_notification_read', { p_event_id: eventId })
    if (error) return { error: 'The notification could not be marked as read. Please retry.' }
    revalidatePath('/customer/notifications')
    revalidatePath('/customer', 'layout')
    return { success: true }
}
