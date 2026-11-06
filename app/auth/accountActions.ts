'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAccount } from '@/lib/auth/account'
import { accountMutationError, authRedirectUrl } from '@/lib/auth/config'
import { textField, validEmail, validPassword, emailDeliveryError, type AuthFormState } from '@/lib/auth/form'

export async function logout(): Promise<void> {
    const unavailable = accountMutationError()
    if (unavailable) redirect('/auth/access-unavailable')
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Sign out failed. Please try again.')
    revalidatePath('/', 'layout')
    redirect('/auth/customer/login')
}

export async function requestPasswordReset(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const email = textField(formData, 'email').trim()
    const data = { email }
    const unavailable = accountMutationError()
    if (unavailable) return { data, error: unavailable }
    if (!validEmail(email)) return { data, error: 'Enter a valid email address.' }
    const redirectTo = authRedirectUrl('/auth/callback?next=/auth/reset-password')
    if (!redirectTo) return { data, error: 'Account recovery is unavailable until the application address is configured.' }
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { data, error: emailDeliveryError(error) || 'A recovery link could not be requested. Please try again later.' }
    return { data, message: 'If the account can receive recovery email, a password-reset link will arrive shortly.' }
}

export async function updatePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const unavailable = accountMutationError()
    if (unavailable) return { error: unavailable }
    const password = textField(formData, 'password')
    if (!validPassword(password)) return { error: 'Use at least 12 characters and at most 72 UTF-8 bytes for your password.' }
    if (password !== textField(formData, 'confirm-password')) return { error: 'The passwords must match.' }
    const { supabase, user } = await requireAccount()
    if (textField(formData, 'user_id') !== user.id) return { error: 'Your account changed. Reload this page before updating your password.' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: 'Your password could not be updated. Request a new recovery link and try again.' }
    const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' })
    revalidatePath('/', 'layout')
    if (logoutError) return { message: 'Your password was updated. Sign out when you finish using this device.' }
    redirect('/auth/customer/login?passwordUpdated=1')
}

export async function beginGoogleLogin(): Promise<AuthFormState> {
    const unavailable = accountMutationError()
    if (unavailable) return { error: unavailable }
    if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true') return { error: 'Google login is unavailable.' }
    const redirectTo = authRedirectUrl('/auth/callback')
    if (!redirectTo) return { error: 'Google login is unavailable until the application address is configured.' }
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error || !data.url) return { error: 'Google login could not be started. Please try email login.' }
    redirect(data.url)
}
