'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { CheckoutRecord } from '@/lib/booking/checkout'
import { formatRentalDate } from '@/lib/fleet/search'
import CheckoutCommand from '../CheckoutCommand'

export default function CheckoutSession({ initial, paymentUrl }: { initial: CheckoutRecord; paymentUrl: string | null }) {
    const [record, setRecord] = useState(initial)
    const [error, setError] = useState('')
    const [now, setNow] = useState(Date.parse(initial.serverNow))
    useEffect(() => { setRecord(initial); setNow(Date.parse(initial.serverNow)) }, [initial])
    useEffect(() => {
        const controller = new AbortController()
        let timer: ReturnType<typeof setTimeout>
        const refresh = async () => {
            try {
                const response = await fetch(`/api/payment/${initial.payment.id}/status`, { cache: 'no-store', signal: controller.signal })
                if (!response.ok) throw new Error('Status unavailable')
                const next: CheckoutRecord = await response.json()
                if (next.booking.customer_id !== initial.booking.customer_id || next.payment.id !== initial.payment.id) throw new Error('Account changed')
                setRecord(next); setNow(Date.parse(next.serverNow)); setError('')
            } catch { if (!controller.signal.aborted) setError('Current payment status could not be loaded. Refresh or retry; this screen cannot assume success.') }
            finally { if (!controller.signal.aborted) timer = setTimeout(refresh, 5000) }
        }
        timer = setTimeout(refresh, 3000)
        return () => { controller.abort(); clearTimeout(timer) }
    }, [initial.payment.id, initial.booking.customer_id])
    const { booking, payment } = record
    const deadlinePassed = now >= Date.parse(booking.hold_expires_at)
    const confirmed = !['held', 'awaiting_confirmation', 'expired', 'failed'].includes(booking.state) && payment.state === 'succeeded'
    return <section className="space-y-4" aria-label="Payment session">
        <p>Booking state: <strong data-testid="booking-state">{booking.state}</strong></p>
        <p>Demo payment state: <strong data-testid="payment-state">{payment.state}</strong></p>
        {error && <p role="alert">{error}</p>}
        {booking.state === 'held' && <p>Hold deadline: {formatRentalDate(booking.hold_expires_at)} IST. The server enforces this deadline.</p>}
        {payment.state === 'pending' && !deadlinePassed && <>
            <p>Open the payment session, then explicitly approve the simulation. Scanning this QR does not approve payment.</p>
            {paymentUrl && <div className="bg-white p-4 w-fit"><QRCodeSVG value={paymentUrl} size={208} title="Open this demo payment session" /></div>}
            <Link className="btn btn-primary" href={`/customer/payment/${payment.id}`}>Open demo payment</Link>
            <p className="text-sm">Sign in with this same customer account if opening on another device. A localhost preview QR works only where the preview is reachable.</p>
        </>}
        {payment.state === 'pending' && deadlinePassed && <p role="status">The hold deadline has passed. Refresh payment status below to record expiry and release this checkout.</p>}
        {payment.state === 'succeeded' && booking.state === 'awaiting_confirmation' && <>
            <p role="status">Demo approval is recorded. Your reservation remains allocated while confirmation is completed.</p>
            <CheckoutCommand command="confirm" userId={booking.customer_id} identifier={payment.id} label="Confirm booking" />
        </>}
        {confirmed && <Link className="btn btn-primary" href={`/customer/bookings/${booking.id}`}>View receipt and timeline</Link>}
        {['expired', 'failed', 'cancelled'].includes(payment.state) && <p role="status">This checkout is {payment.state}. No money was transferred. <Link className="link" href={`/customer/cars/${record.quote.vehicle_id}`}>Choose dates for a new quote</Link>.</p>}
        <CheckoutCommand command="reconcile" userId={booking.customer_id} identifier={payment.id} label="Refresh payment status" />
    </section>
}
