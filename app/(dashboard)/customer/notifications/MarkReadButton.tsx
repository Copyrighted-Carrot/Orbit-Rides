'use client'

import { useActionState } from 'react'
import { markRead, type NotificationResult } from './actions'

export default function MarkReadButton({ eventId, userId }: { eventId: number; userId: string }) {
    const [state, action, pending] = useActionState<NotificationResult, FormData>(markRead, {})
    return <form action={action} className="space-y-2">
        <input type="hidden" name="event_id" value={eventId} /><input type="hidden" name="user_id" value={userId} />
        <button className="btn btn-sm btn-outline" type="submit" disabled={pending}>{pending ? 'Saving…' : state.success ? 'Read' : 'Mark as read'}</button>
        {state.error && <p role="alert">{state.error}</p>}
    </form>
}
