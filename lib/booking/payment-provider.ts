import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/clean.types'

export type PaymentState = 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled'
export interface PaymentProvider {
    readonly name: string
    approve(sessionId: string): Promise<PaymentState>
    decline(sessionId: string): Promise<PaymentState>
}

export class DemoPaymentProvider implements PaymentProvider {
    readonly name = 'demo'
    private async result(command: 'approve_demo_payment' | 'decline_demo_payment', sessionId: string) {
        const client = await createClient<Database>()
        const { data, error } = await client.rpc(command, { p_session_id: sessionId })
        if (error) throw new Error('Demo payment could not be recorded. Refresh its status before retrying.')
        if (!['pending', 'succeeded', 'failed', 'expired', 'cancelled'].includes(data)) throw new Error('Invalid provider result.')
        return data as PaymentState
    }
    approve(sessionId: string) { return this.result('approve_demo_payment', sessionId) }
    decline(sessionId: string) { return this.result('decline_demo_payment', sessionId) }
}

export function paymentProvider(name: string): PaymentProvider {
    if (name === 'demo') return new DemoPaymentProvider()
    throw new Error('This payment provider is not available in this demo.')
}
