import 'server-only'
import { configuredApplicationOrigin } from './paths'

export function accountMutationError() {
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!configured) return 'Account services are unavailable. Please try again later.'
    try {
        if (new URL(configured).hostname === 'mcjjplnltatdmcuffhhf.supabase.co') {
            return 'Account changes are unavailable while this installation uses the historical archive.'
        }
    } catch {
        return 'Account services are unavailable. Please try again later.'
    }
    return null
}

export function authRedirectUrl(path: string) {
    const origin = configuredApplicationOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    if (!origin || !path.startsWith('/') || path.startsWith('//')) return null
    const target = new URL(path, origin)
    return target.origin === origin ? target.href : null
}
