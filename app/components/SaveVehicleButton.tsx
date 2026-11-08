'use client'
import { useState, type FormEvent } from 'react'
import { saveVehicle } from '@/app/(dashboard)/customer/activity/actions'

export default function SaveVehicleButton({ vehicleId, userId, saved }: { vehicleId: string; userId: string; saved: boolean }) {
    const [pending, setPending] = useState(false), [error, setError] = useState('')
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setPending(true); setError('')
        try {
            const result = await saveVehicle(form)
            if (result.ok) { window.location.reload(); return }
            setError(result.error || 'Saved state could not be verified.')
        } catch { setError('The response was interrupted. Reload saved state before retrying; repeating the same action is safe.') }
        finally { setPending(false) }
    }
    return <form onSubmit={submit} className="space-y-2">
        <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="saved" value={String(!saved)} />
        <button className="btn btn-outline btn-sm" type="submit" disabled={pending}>{pending ? 'Saving…' : saved ? 'Remove from wishlist' : 'Add to wishlist'}</button>
        {error && <div role="alert"><p>{error}</p><button className="link" type="button" onClick={() => window.location.reload()}>Reload saved state</button></div>}
    </form>
}
