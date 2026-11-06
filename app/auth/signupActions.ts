'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { accountMutationError, authRedirectUrl } from '@/lib/auth/config'
import { textField, validEmail, validPassword, emailDeliveryError, type AuthFormState } from '@/lib/auth/form'

export async function signupCustomerWithEmail(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const email = textField(formData, 'email').trim()
    const username = textField(formData, 'username').trim()
    const password = textField(formData, 'password')
    const data = { email, username }
    const unavailable = accountMutationError()
    if (unavailable) return { data, error: unavailable }
    if (!validEmail(email) || username.length < 1 || username.length > 80) {
        return { data, error: 'Enter a valid email and a display name of 1 to 80 characters.' }
    }
    if (!validPassword(password)) return { data, error: 'Use at least 12 characters and at most 72 UTF-8 bytes for your password.' }
    const emailRedirectTo = authRedirectUrl('/auth/callback')
    if (!emailRedirectTo) return { data, error: 'Email confirmation is unavailable until the application address is configured.' }
    const supabase = await createClient()
    const { data: account, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo, data: { display_name: username } },
    })
    if (error) return { data, error: emailDeliveryError(error) || 'Registration could not be completed. Please try again or use account recovery.' }
    if (account.session) redirect('/customer')
    return { data, message: 'Check your email to confirm your account, then log in.' }
}
