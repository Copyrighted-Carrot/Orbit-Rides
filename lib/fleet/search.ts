export const RENTAL_TIME_ZONE = 'Asia/Kolkata'
export const RENTAL_TIME_LABEL = 'India Standard Time (UTC+05:30)'
export const PAGE_SIZE = 12

export type SearchFilters = {
    pickup: string; dropoff: string; q: string; type: string; max: string; page: number
}

export function validVehicleId(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function parseRupees(value: string): number | null {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) return null
    const [whole, fraction = ''] = value.split('.')
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    return Number.isSafeInteger(amount) && amount <= 100000000 ? amount : null
}

export function rentalInstant(value: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
    const date = new Date(value + ':00+05:30')
    if (!Number.isFinite(date.getTime())) return null
    // Reject calendar overflow such as February 31 instead of silently changing it.
    const local = new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 16)
    return local === value ? date.toISOString() : null
}

export function parseSearchParams(input: Record<string, string | string[] | undefined>, now = Date.now()) {
    const keys = ['pickup', 'dropoff', 'q', 'type', 'max', 'page'] as const
    const filters: SearchFilters = {
        pickup: typeof input.pickup === 'string' ? input.pickup : '',
        dropoff: typeof input.dropoff === 'string' ? input.dropoff : '',
        q: typeof input.q === 'string' ? input.q.trim() : '',
        type: typeof input.type === 'string' ? input.type : '',
        max: typeof input.max === 'string' ? input.max : '',
        page: typeof input.page === 'string' && /^[1-9]\d{0,4}$/.test(input.page) ? Number(input.page) : 1,
    }
    let error: string | null = null
    const startsAt = filters.pickup ? rentalInstant(filters.pickup) : null
    const endsAt = filters.dropoff ? rentalInstant(filters.dropoff) : null
    const maxRateMinor = filters.max ? parseRupees(filters.max) : null
    if (keys.some(key => Array.isArray(input[key]))) error = 'Use one value for each search field.'
    else if (filters.q.length > 100 || /[\u0000-\u001f]/.test(filters.q)) error = 'Search must be at most 100 characters.'
    else if (filters.type && !validVehicleId(filters.type)) error = 'Choose a valid vehicle type.'
    else if (filters.max && maxRateMinor === null) error = 'Enter a valid daily price in INR, up to ₹10,00,000.'
    else if (input.page && (typeof input.page !== 'string' || !/^[1-9]\d{0,4}$/.test(input.page))) error = 'Invalid results page.'
    else if (Boolean(filters.pickup) !== Boolean(filters.dropoff)) error = 'Choose both pickup and return date/time.'
    else if (filters.pickup && (!startsAt || !endsAt)) error = 'Enter valid pickup and return date/time.'
    else if (startsAt && endsAt && (Date.parse(startsAt) <= now || Date.parse(endsAt) <= Date.parse(startsAt))) {
        error = 'Pickup must be in the future and return must be after pickup.'
    }
    return { filters, error, startsAt, endsAt, maxRateMinor }
}

export function toSearchParams(filters: Partial<SearchFilters>) {
    const result = new URLSearchParams()
    for (const key of ['pickup', 'dropoff', 'q', 'type', 'max', 'page'] as const) {
        const value = filters[key]
        if (value !== undefined && value !== '' && !(key === 'page' && value === 1)) result.set(key, String(value))
    }
    return result
}

export function formatMoney(minor: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(minor / 100)
}

export function rentalLocalValue(iso: string) {
    return new Date(Date.parse(iso) + 330 * 60000).toISOString().slice(0, 16)
}

export function formatRentalDate(iso: string) {
    return new Intl.DateTimeFormat('en-IN', { timeZone: RENTAL_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
