export type AuthFormState = {
    data?: { email?: string; username?: string }
    error?: string
    message?: string
}

export function emailDeliveryError(error: { code?: string; status?: number } | null) {
    return error?.code === 'over_email_send_rate_limit' || error?.status === 429
        ? 'Email delivery is temporarily rate-limited. Please wait before requesting another link.'
        : null
}

export function textField(data: FormData, name: string) {
    const value = data.get(name)
    return typeof value === 'string' ? value : ''
}

export function validEmail(value: string) {
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validPassword(value: string) {
    return value.length >= 12 && new TextEncoder().encode(value).length <= 72
}
