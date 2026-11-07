'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'
import { textField } from '@/lib/auth/form'
import { validVehicleId } from '@/lib/fleet/search'
import { readOwnedPayment } from '@/lib/booking/checkout'
import { paymentProvider } from '@/lib/booking/payment-provider'

export type CheckoutActionState = { error?: string; message?: string }

function refreshBooking(bookingId: string) {
    for (const path of ['/customer/bookings', '/customer/notifications', '/customer/profile', '/admin/bookings', '/customer/cars']) revalidatePath(path, 'layout')
    revalidatePath(`/customer/checkout/${bookingId}`)
    revalidatePath(`/customer/bookings/${bookingId}`)
}

export async function beginCheckout(_state: CheckoutActionState, form: FormData): Promise<CheckoutActionState> {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload this page before continuing.' }
    const quoteId = textField(form, 'quote_id')
    if (!validVehicleId(quoteId)) return { error: 'Request a valid rental quote.' }
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('start_checkout', { p_quote_id: quoteId })
    if (error) return { error: error.code === '23P01' ? 'Another reservation now occupies these dates. Choose another vehicle or interval.' : 'The quote could not start checkout. It may have expired; request a current quote.' }
    refreshBooking(data)
    redirect(`/customer/checkout/${data}`)
}

async function ownedSession(form: FormData) {
    const { user } = await requireAccount('customer')
    if (textField(form, 'user_id') !== user.id) return { error: 'Your account changed. Reload before continuing.' } as const
    const id = textField(form, 'session_id')
    if (!validVehicleId(id)) return { error: 'Invalid payment session.' } as const
    const record = await readOwnedPayment(user.id, id)
    if (!record) return { error: 'Payment session unavailable for this account.' } as const
    return { record } as const
}

export async function approvePayment(_state: CheckoutActionState, form: FormData): Promise<CheckoutActionState> {
    const owned = await ownedSession(form)
    if (owned.error) return { error: owned.error }
    const { record } = owned
    try {
        const state = await paymentProvider(record.payment.provider).approve(record.payment.id)
        refreshBooking(record.booking.id)
        revalidatePath(`/customer/payment/${record.payment.id}`)
        return { message: state === 'succeeded' ? 'Demo approval recorded. No money was transferred. Confirm the reservation to finish.' : `Payment session is ${state}. No money was transferred.` }
    } catch { return { error: 'Approval could not be verified. Refresh the payment status before retrying; repeating approval is safe.' } }
}

export async function declinePayment(_state: CheckoutActionState, form: FormData): Promise<CheckoutActionState> {
    const owned = await ownedSession(form)
    if (owned.error) return { error: owned.error }
    try {
        const state = await paymentProvider(owned.record.payment.provider).decline(owned.record.payment.id)
        refreshBooking(owned.record.booking.id)
        revalidatePath(`/customer/payment/${owned.record.payment.id}`)
        return { message: `Demo payment session is ${state}. No money was transferred.` }
    } catch { return { error: 'The result could not be verified. Refresh its status before retrying.' } }
}

export async function reconcilePayment(_state: CheckoutActionState, form: FormData): Promise<CheckoutActionState> {
    const owned = await ownedSession(form)
    if (owned.error) return { error: owned.error }
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('reconcile_checkout', { p_session_id: owned.record.payment.id })
    if (error) return { error: 'Payment status could not be refreshed. Please retry.' }
    refreshBooking(owned.record.booking.id)
    revalidatePath(`/customer/payment/${owned.record.payment.id}`)
    return { message: `Verified payment state: ${data}.` }
}

export async function confirmBooking(_state: CheckoutActionState, form: FormData): Promise<CheckoutActionState> {
    const owned = await ownedSession(form)
    if (owned.error) return { error: owned.error }
    const client = await createClient<Database>()
    const { data, error } = await client.rpc('finalize_booking', { p_session_id: owned.record.payment.id })
    if (error) return { error: 'The reservation could not be confirmed. Refresh its status before retrying. A repeated confirmation cannot create another booking.' }
    refreshBooking(owned.record.booking.id)
    if (!data) return { error: 'The server has not verified a successful payment for this reservation. Check its current payment state.' }
    redirect(`/customer/bookings/${data}`)
}
