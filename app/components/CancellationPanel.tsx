import { randomUUID } from 'node:crypto'
import CancellationForm from './CancellationForm'
import type { Database } from '@/lib/supabase/clean.types'
import { formatRentalDate } from '@/lib/fleet/search'

type Request = Database['public']['Tables']['cancellation_requests']['Row']
export default function CancellationPanel({ bookingId, state, userId, role, requests, total }: { bookingId: string; state: string; userId: string; role: 'customer' | 'admin'; requests: Request[]; total: number }) {
    const pending = requests.find(request => !request.decision)
    const eligible = ['confirmed', 'ready'].includes(state)
    return <section aria-label="Cancellation" className="space-y-4">
        <h2 className="text-2xl font-semibold">Cancellation</h2>
        <p>Before pickup, the customer may request cancellation. Inventory is released only when the operator accepts. Demo payments involve no money or refunds.</p>
        {pending && <p role="status">Cancellation awaiting operator decision. The reservation remains in place.</p>}
        {role === 'customer' && eligible && !pending && <CancellationForm userId={userId} bookingId={bookingId} requestId={randomUUID()} />}
        {role === 'admin' && pending && eligible && <div className="grid sm:grid-cols-2 gap-3"><CancellationForm userId={userId} bookingId={bookingId} requestId={pending.id} decision="accept" /><CancellationForm userId={userId} bookingId={bookingId} requestId={pending.id} decision="reject" /></div>}
        {!eligible && <p>Self-service cancellation is unavailable in this booking state.</p>}
        {requests.map(request => <article key={request.id} className="border rounded p-4 space-y-2" data-cancellation-id={request.id}><p>Requested {formatRentalDate(request.requested_at)} IST</p><p>{request.reason}</p><p>Decision: <strong>{request.decision || 'pending'}</strong></p>{request.decision && <><p>{request.decision_reason}</p><p>Decided {formatRentalDate(request.decided_at!)} IST</p></>}</article>)}
        {total > requests.length && <p>Showing the latest {requests.length} of {total} requests. Earlier outcomes remain in the booking timeline.</p>}
    </section>
}
