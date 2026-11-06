'use client'
import { useActionState } from 'react'
import { updatePickupLocation } from './actions'
import type { FleetFormState } from '@/lib/fleet/admin'
import type { PickupLocation } from '@/lib/fleet/catalogue'

export default function PickupForm({ location }: { location: PickupLocation | null }) {
    const [state, action, pending] = useActionState<FleetFormState, FormData>(updatePickupLocation, {})
    return <form action={action} className="space-y-5 max-w-2xl">
        <label className="form-control gap-1">Pickup location name<input className="input input-bordered" name="name" aria-label="Pickup location name" maxLength={120} required defaultValue={location?.name || ''} /></label>
        <label className="form-control gap-1">City<input className="input input-bordered" name="city" aria-label="City" maxLength={120} required defaultValue={location?.city || ''} /></label>
        <label className="form-control gap-1">Address<textarea className="textarea textarea-bordered" name="address" aria-label="Address" maxLength={500} required defaultValue={location?.address || ''} /></label>
        <p className="text-sm">These public pickup details are copied into each new rental quote. Editing them will not rewrite previous quotes.</p>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save pickup location'}</button>
        {state.error && <p role="alert" className="text-error">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
    </form>
}
