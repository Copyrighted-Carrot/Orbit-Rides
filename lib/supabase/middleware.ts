import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { accountHome, isAccountRole, configuredApplicationOrigin } from '@/lib/auth/paths'
import { guardedSupabaseFetch } from './transport'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { global: { fetch: guardedSupabaseFetch }, cookies: {
            getAll: () => request.cookies.getAll(),
            setAll(cookies) {
                cookies.forEach(({ name, value }) => request.cookies.set(name, value))
                const previous = response.cookies.getAll()
                response = NextResponse.next({ request })
                previous.forEach(cookie => response.cookies.set(cookie))
                cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
            },
        } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname
    const admin = pathname === '/admin' || pathname.startsWith('/admin/')
    const customer = pathname === '/customer' || pathname.startsWith('/customer/')
    const authForm = /^\/auth\/(admin|customer)\/(login|signup|signup-with-email)\/?$/.test(pathname)

    function move(path: string) {
        const target = new URL(path, configuredApplicationOrigin(process.env.NEXT_PUBLIC_SITE_URL) || request.nextUrl.origin)
        const redirected = NextResponse.redirect(target)
        response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie))
        redirected.headers.set('Cache-Control', 'private, no-store')
        return redirected
    }

    if (!user && (admin || customer)) {
        const next = encodeURIComponent(`${pathname}${request.nextUrl.search}`)
        return move(`/auth/${admin ? 'admin' : 'customer'}/login?next=${next}`)
    }
    if (user && (admin || customer || authForm)) {
        const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
        if (error || !isAccountRole(data?.role)) return move('/auth/access-unavailable')
        if (authForm || (admin && data.role !== 'admin') || (customer && data.role !== 'customer')) {
            return move(accountHome(data.role))
        }
    }
    if (user || admin || customer || pathname.startsWith('/auth/')) response.headers.set('Cache-Control', 'private, no-store')
    return response
}
