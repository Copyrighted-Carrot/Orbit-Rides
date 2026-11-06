import { NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { accountMutationError } from '@/lib/auth/config'
import { isAccountRole, safeReturnPath } from '@/lib/auth/paths'

export async function GET(request: NextRequest) {
    const { supabase, finish, canonicalRedirect, configured } = createRouteClient(request)
    if (!configured || accountMutationError()) return finish('/auth/access-unavailable')
    const canonical = canonicalRedirect()
    if (canonical) return canonical
    const token_hash = request.nextUrl.searchParams.get('token_hash')
    const type = request.nextUrl.searchParams.get('type')
    if (!token_hash || token_hash.length > 2048 || !['email', 'signup', 'recovery'].includes(type || '')) return finish('/auth/link-error')
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: type as 'email' | 'signup' | 'recovery' })
    if (error || !data.user) return finish('/auth/link-error')
    if (type === 'recovery') return finish('/auth/reset-password')
    const { data: account, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
    if (roleError || !isAccountRole(account?.role)) return finish('/auth/access-unavailable')
    return finish(safeReturnPath(request.nextUrl.searchParams.get('next'), account.role))
}
