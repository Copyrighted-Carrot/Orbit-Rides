import { NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { accountMutationError } from '@/lib/auth/config'
import { isAccountRole, safeReturnPath } from '@/lib/auth/paths'

export async function GET(request: NextRequest) {
    const { supabase, finish, canonicalRedirect, configured } = createRouteClient(request)
    if (!configured || accountMutationError()) return finish('/auth/access-unavailable')
    const canonical = canonicalRedirect()
    if (canonical) return canonical
    const code = request.nextUrl.searchParams.get('code')
    if (!code || code.length > 2048) return finish('/auth/link-error')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) return finish('/auth/link-error')
    const { data: account, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
    if (roleError || !isAccountRole(account?.role)) return finish('/auth/access-unavailable')
    const next = request.nextUrl.searchParams.get('next')
    if (next === '/auth/reset-password') return finish(next)
    return finish(safeReturnPath(next, account.role))
}
