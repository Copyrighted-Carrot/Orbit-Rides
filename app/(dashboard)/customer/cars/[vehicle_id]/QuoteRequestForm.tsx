'use client'

import { useActionState } from 'react'
import { requestQuote, type QuoteFormState } from './actions'

export default function QuoteRequestForm({ vehicleId, userId, requestId, pickup, dropoff }: { vehicleId: string; userId: string; requestId: string; pickup: string; dropoff: string }) {
    const [state, action, pending] = useActionState<QuoteFormState, FormData>(requestQuote, {})
    return <form action={action} className="space-y-3">
        <input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="request_id" value={requestId} /><input type="hidden" name="pickup" value={pickup} /><input type="hidden" name="dropoff" value={dropoff} />
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? 'Requesting quote…' : 'Get rental quote'}</button>
        {state.error && <p role="alert" className="text-error">{state.error}</p>}
    </form>
}
