import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { accountHome, isAccountRole, type AccountRole } from './paths'

export const getAccount = cache(async () => {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null
    const { data: role, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
    if (error || !isAccountRole(role?.role)) return { user, role: null, supabase }
    return { user, role: role.role, supabase }
})

export async function requireAccount(expectedRole?: AccountRole) {
    const account = await getAccount()
    if (!account) redirect(expectedRole === 'admin' ? '/auth/admin/login' : '/auth/customer/login')
    if (!account.role) redirect('/auth/access-unavailable')
    if (expectedRole && account.role !== expectedRole) redirect(accountHome(account.role))
    return { ...account, role: account.role }
}

export async function getOwnProfile() {
    const account = await requireAccount()
    const { data, error } = await account.supabase.from('user_profiles').select('display_name').eq('user_id', account.user.id).maybeSingle()
    if (error) throw new Error('Your profile could not be loaded. Please try again.')
    return { ...account, profile: data, displayName: data?.display_name?.trim() || 'Customer' }
}
