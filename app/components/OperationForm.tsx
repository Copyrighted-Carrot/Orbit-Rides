'use client'
import { useState, type FormEvent } from 'react'
import { operateBooking, type OperationResult } from '@/app/(dashboard)/admin/bookings/operation-actions'

type OperationProps = { command: 'ready' | 'pickup' | 'return' | 'inspect' | 'fail' | 'clear' | 'complete'; userId: string; bookingId: string; minimumMileage?: number }
export default function OperationForm(props: OperationProps) {
    return <CommandForm key={`${props.userId}:${props.bookingId}:${props.command}`} {...props} />
}

function CommandForm({ command, userId, bookingId, minimumMileage = 0 }: OperationProps) {
    const [state, setState] = useState<OperationResult>({})
    const [pending, setPending] = useState(false)
    const [values, setValues] = useState({ condition: '', fuel: '', mileage: '', damage: '', notes: '', reason: '' })
    const field = (name: keyof typeof values) => ({ value: values[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(previous => ({ ...previous, [name]: event.target.value })) })
    const label = { ready: 'Mark ready', pickup: 'Record pickup', return: 'Record return', inspect: 'Start inspection', fail: 'Record maintenance required', clear: 'Record inspection clearance', complete: 'Complete rental' }[command]
    const handover = command === 'pickup' || command === 'return'
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setPending(true); setState({})
        try {
            const result = await operateBooking({}, data)
            if (result.bookingId) { window.location.assign(`/admin/bookings/${result.bookingId}`); return }
            setState(result)
        } catch { setState({ error: 'The response was interrupted. Reload the saved booking before retrying identical details.' }) }
        finally { setPending(false) }
    }
    return <form onSubmit={submit} aria-label={label} className="border rounded-lg p-4 space-y-3">
        <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="booking_id" value={bookingId} /><input type="hidden" name="command" value={command} />
        {handover && <fieldset disabled={pending} className="grid sm:grid-cols-2 gap-3">
            <label className="form-control gap-1">Condition<textarea className="textarea textarea-bordered" name="condition" required maxLength={500} {...field('condition')} /></label>
            <label className="form-control gap-1">Fuel / charge (%)<input className="input input-bordered" name="fuel" type="number" min={0} max={100} step={1} required {...field('fuel')} /></label>
            <label className="form-control gap-1">Mileage (km)<input className="input input-bordered" name="mileage" type="number" min={minimumMileage} max={2147483647} step={1} required {...field('mileage')} /></label>
            <label className="form-control gap-1">{command === 'pickup' ? 'Existing damage' : 'New damage / changes'}<textarea className="textarea textarea-bordered" name="damage" maxLength={2000} {...field('damage')} /></label>
            <label className="form-control gap-1">Staff-only notes<textarea className="textarea textarea-bordered" name="notes" maxLength={2000} {...field('notes')} /></label>
        </fieldset>}
        {['fail', 'clear'].includes(command) && <label className="form-control gap-1">Staff-only inspection reason<textarea className="textarea textarea-bordered" name="reason" maxLength={500} required {...field('reason')} /></label>}
        <button className="btn btn-outline" type="submit" disabled={pending}>{pending ? 'Saving…' : label}</button>
        {state.error && <div role="alert"><p>{state.error}</p><a className="link" href={`/admin/bookings/${bookingId}`}>Reload saved booking</a></div>}
    </form>
}
