import { NextResponse } from 'next/server'
import { getAccount } from '@/lib/auth/account'
import { readOwnedPayment } from '@/lib/booking/checkout'
import { validVehicleId } from '@/lib/fleet/search'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ session_id: string }> }) {
    const account = await getAccount()
    const options = { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }
    if (!account) return NextResponse.json({ error: 'Sign in required.' }, { ...options, status: 401 })
    if (account.role !== 'customer') return NextResponse.json({ error: 'Customer access required.' }, { ...options, status: 403 })
    const { session_id } = await params
    if (!validVehicleId(session_id)) return NextResponse.json({ error: 'Invalid session reference.' }, { ...options, status: 400 })
    try {
        const record = await readOwnedPayment(account.user.id, session_id)
        if (!record) return NextResponse.json({ error: 'Session unavailable.' }, { ...options, status: 404 })
        return NextResponse.json(record, options)
    } catch { return NextResponse.json({ error: 'Payment status unavailable. Please retry.' }, { ...options, status: 503 }) }
}
