'use server'

import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { accountMutationError } from '@/lib/auth/config'

export async function updateProfile(formData: { display_name: string; user_id: string }) {
    const unavailable = accountMutationError()
    if (unavailable) return { success: false, error: unavailable }
    const displayName = typeof formData?.display_name === 'string' ? formData.display_name.trim() : ''
    if (displayName.length < 1 || displayName.length > 80) return { success: false, error: 'Use a display name of 1 to 80 characters.' }
    const { supabase, user } = await requireAccount()
    if (formData.user_id !== user.id) return { success: false, error: 'Your account changed. Reload this page before saving.' }
    const { error } = await supabase.rpc('update_my_profile', { p_display_name: displayName })
    if (error) return { success: false, error: 'Your profile could not be saved. Please try again.' }
    revalidatePath('/', 'layout')
    return { success: true }
}
