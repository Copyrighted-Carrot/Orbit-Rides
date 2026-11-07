'use client'
import { useActionState } from 'react'
import { beginCheckout, approvePayment, declinePayment, reconcilePayment, confirmBooking, type CheckoutActionState } from './actions'

const commands = { begin: beginCheckout, approve: approvePayment, decline: declinePayment, reconcile: reconcilePayment, confirm: confirmBooking }
export default function CheckoutCommand({ command, userId, identifier, label, disabled = false }: { command: keyof typeof commands; userId: string; identifier: string; label: string; disabled?: boolean }) {
    const [state, action, pending] = useActionState<CheckoutActionState, FormData>(commands[command], {})
    return <form action={action} className="space-y-2">
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name={command === 'begin' ? 'quote_id' : 'session_id'} value={identifier} />
        <button className={command === 'reconcile' || command === 'decline' ? 'btn btn-outline' : 'btn btn-primary'} type="submit" disabled={disabled || pending}>{pending ? 'Checking with server…' : label}</button>
        {state.error && <p role="alert" className="text-error">{state.error}</p>}
        {state.message && <p role="status">{state.message}</p>}
    </form>
}
