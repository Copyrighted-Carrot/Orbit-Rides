'use server'

import { redirect } from 'next/navigation'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { parseSearchParams, validVehicleId } from '@/lib/fleet/search'
import { textField } from '@/lib/auth/form'

export type QuoteFormState = { error?: string }

export async function requestQuote(_state: QuoteFormState, form: FormData): Promise<QuoteFormState> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before requesting a quote.' }
    const vehicleId = textField(form, 'vehicle_id'), requestId = textField(form, 'request_id')
    if (!validVehicleId(vehicleId) || !validVehicleId(requestId)) return { error: 'Select a valid vehicle and retry.' }
    const search = parseSearchParams({ pickup: textField(form, 'pickup'), dropoff: textField(form, 'dropoff') })
    if (search.error || !search.startsAt || !search.endsAt) return { error: search.error || 'Choose pickup and return date/time.' }
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('create_quote', { p_vehicle_id: vehicleId, p_starts_at: search.startsAt, p_ends_at: search.endsAt, p_request_id: requestId })
    if (error) return { error: error.code === '55000' ? 'Pickup details are currently unavailable. Please try again later.' : 'This rental could not be quoted. Availability may have changed; refresh and choose another interval.' }
    redirect('/customer/booking/quote/' + data)
}
