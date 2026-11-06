export type AccountRole = 'admin' | 'customer'

export function configuredApplicationOrigin(configured: string | undefined) {
    if (!configured) return null
    try {
        const value = new URL(configured)
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(value.hostname)
        if (value.username || value.password || (value.protocol !== 'https:' && !(local && value.protocol === 'http:'))) return null
        return value.origin
    } catch { return null }
}

export function isAccountRole(value: unknown): value is AccountRole {
    return value === 'admin' || value === 'customer'
}

export function accountHome(role: AccountRole) {
    return role === 'admin' ? '/admin' : '/customer'
}

export function safeReturnPath(value: unknown, role: AccountRole) {
    const fallback = accountHome(role)
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) {
        return fallback
    }
    const destination = new URL(value, 'https://orbit.invalid')
    if (destination.origin !== 'https://orbit.invalid' ||
        (destination.pathname !== fallback && !destination.pathname.startsWith(`${fallback}/`))) {
        return fallback
    }
    return `${destination.pathname}${destination.search}`
}
