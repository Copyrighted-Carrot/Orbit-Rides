import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/database.types'
import { guardedSupabaseFetch } from './transport'
import { authRedirectUrl } from '@/lib/auth/config'

// Route handlers must carry the exchange's cookies onto their redirect response.
export function createRouteClient(request: NextRequest) {
    const applicationOrigin = authRedirectUrl('/')
    const pending = new Map<string, { value: string; options: CookieOptions }>()
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            global: { fetch: guardedSupabaseFetch },
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll(cookies) {
                    for (const { name, value, options } of cookies) {
                        request.cookies.set(name, value)
                        pending.set(name, { value, options })
                    }
                },
            },
        },
    )
    function finish(path: string) {
        if (!applicationOrigin) return NextResponse.json(
            { error: 'The application address is not configured.' },
            { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
        )
        const response = NextResponse.redirect(new URL(path, applicationOrigin))
        for (const [name, { value, options }] of pending) response.cookies.set(name, value, options)
        response.headers.set('Cache-Control', 'private, no-store')
        response.headers.set('Referrer-Policy', 'no-referrer')
        return response
    }
    function canonicalRedirect() {
        if (!applicationOrigin || request.headers.get('host')?.toLowerCase() === new URL(applicationOrigin).host.toLowerCase()) return null
        const response = NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, applicationOrigin))
        response.headers.set('Cache-Control', 'private, no-store')
        response.headers.set('Referrer-Policy', 'no-referrer')
        return response
    }
    return { supabase, finish, canonicalRedirect, configured: Boolean(applicationOrigin) }
}
