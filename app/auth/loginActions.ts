'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { accountMutationError } from '@/lib/auth/config'
import { isAccountRole, safeReturnPath } from '@/lib/auth/paths'
import { textField, validEmail, type AuthFormState } from '@/lib/auth/form'

export async function loginAdmin(state: AuthFormState, data: FormData): Promise<AuthFormState> {
    return login(state, data, true)
}

export async function loginCustomer(state: AuthFormState, data: FormData): Promise<AuthFormState> {
    return login(state, data, false)
}

async function login(_state: AuthFormState, formData: FormData, adminOnly: boolean): Promise<AuthFormState> {
    const email = textField(formData, 'email').trim()
    const password = textField(formData, 'password')
    const data = { email }
    const unavailable = accountMutationError()
    if (unavailable) return { data, error: unavailable }
    if (!validEmail(email) || !password || password.length > 1024) return { data, error: 'Enter a valid email and password.' }
    const supabase = await createClient()
    const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !signedIn.user) return { data, error: 'Login failed. Check your credentials and confirm your email before trying again.' }
    const { data: role, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', signedIn.user.id).maybeSingle()
    if (roleError || !isAccountRole(role?.role)) {
        await supabase.auth.signOut({ scope: 'local' })
        return { data, error: 'Account access could not be verified. Please try again.' }
    }
    if (adminOnly && role.role !== 'admin') {
        await supabase.auth.signOut({ scope: 'local' })
        return { data, error: 'This account does not have administrator access. Use customer login.' }
    }
    redirect(safeReturnPath(textField(formData, 'next'), role.role))
}
