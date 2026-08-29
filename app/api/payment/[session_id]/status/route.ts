import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/payment/[session_id]/status
// Public endpoint — no auth required. Session UUID is the secret.
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ session_id: string }> }
) {
    const { session_id } = await params;
    
    if (!session_id) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('payment_sessions')
        .select('id, status, amount, confirmed_at, booking_data')
        .eq('id', session_id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ 
        id: data.id,
        status: data.status, 
        amount: data.amount,
        confirmed_at: data.confirmed_at 
    });
}

// POST /api/payment/[session_id]/status
// Confirms a payment session — called by the phone confirmation page
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ session_id: string }> }
) {
    const { session_id } = await params;
    
    if (!session_id) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // First check if session exists and is pending
    const { data: session } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'confirmed') {
        return NextResponse.json({ status: 'already_confirmed', message: 'Payment was already confirmed' });
    }

    if (session.status === 'expired' || session.status === 'cancelled') {
        return NextResponse.json({ error: 'Session is no longer valid' }, { status: 410 });
    }

    // Update to confirmed
    const { error } = await supabase
        .from('payment_sessions')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', session_id);

    if (error) {
        return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
    }

    // Return booking data for the confirmation page
    const bd = session.booking_data as Record<string, Record<string, string>> | null;
    const carName = bd?.car ? `${bd.car.manufacturer} ${bd.car.model}` : 'Your Vehicle';

    return NextResponse.json({ 
        status: 'confirmed', 
        carName,
        amount: session.amount 
    });
}
