'use client'
import { useActionState } from 'react'
import { requestCancellation, type CancellationResult } from '@/app/(dashboard)/customer/bookings/actions'
import { decideCancellation } from '@/app/(dashboard)/admin/bookings/actions'

export default function CancellationForm({ userId, bookingId, requestId, decision }: { userId: string; bookingId: string; requestId: string; decision?: 'accept' | 'reject' }) {
    const [state, action, pending] = useActionState<CancellationResult, FormData>(decision ? decideCancellation : requestCancellation, {})
    const label = decision === 'accept' ? 'Accept cancellation' : decision === 'reject' ? 'Reject cancellation' : 'Request cancellation'
    return <form action={action} className="space-y-3 border rounded-lg p-4" aria-label={label}>
        <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="booking_id" value={bookingId} /><input type="hidden" name="request_id" value={requestId} />{decision && <input type="hidden" name="decision" value={decision} />}
        <label className="form-control gap-2">{decision ? 'Customer-visible reason' : 'Cancellation reason'}<textarea name="reason" className="textarea textarea-bordered" required maxLength={500} /></label>
        <button type="submit" disabled={pending} className="btn btn-outline">{pending ? 'Saving…' : label}</button>
        {state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
    </form>
}
