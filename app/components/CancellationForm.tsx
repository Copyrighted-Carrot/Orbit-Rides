'use client'
import { useState, type FormEvent } from 'react'
import { requestCancellation, type CancellationResult } from '@/app/(dashboard)/customer/bookings/actions'
import { decideCancellation } from '@/app/(dashboard)/admin/bookings/actions'

export default function CancellationForm({ userId, bookingId, requestId, decision }: { userId: string; bookingId: string; requestId: string; decision?: 'accept' | 'reject' }) {
    const [state, setState] = useState<CancellationResult>({})
    const [pending, setPending] = useState(false)
    const [reason, setReason] = useState('')
    const label = decision === 'accept' ? 'Accept cancellation' : decision === 'reject' ? 'Reject cancellation' : 'Request cancellation'
    const savedPath = `/${decision ? 'admin' : 'customer'}/bookings/${bookingId}`
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setPending(true); setState({})
        try {
            const result = await (decision ? decideCancellation({}, data) : requestCancellation({}, data))
            if (result.message) { window.location.assign(savedPath); return }
            setState(result)
        } catch { setState({ error: 'The response was interrupted. Reload the saved request before retrying.' }) }
        finally { setPending(false) }
    }
    return <form onSubmit={submit} className="space-y-3 border rounded-lg p-4" aria-label={label}>
        <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="booking_id" value={bookingId} /><input type="hidden" name="request_id" value={requestId} />{decision && <input type="hidden" name="decision" value={decision} />}
        <label className="form-control gap-2">{decision ? 'Customer-visible reason' : 'Cancellation reason'}<textarea name="reason" className="textarea textarea-bordered" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <button type="submit" disabled={pending} className="btn btn-outline">{pending ? 'Saving…' : label}</button>
        {state.error && <div role="alert"><p>{state.error}</p><a className="link" href={savedPath}>Reload saved booking</a></div>}
    </form>
}
