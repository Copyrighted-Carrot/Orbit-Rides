'use server';
import { createClient } from '@/lib/supabase/server';
import { checkCarAvailability } from '@/lib/util/availability';

export async function createPaymentSession(bookingData: {
    car: { id: number; manufacturer: string; model: string; price_per_day: number; img_urls: string[] };
    totalPrice: number;
    rentDate: string;
    deliveryLocation: string;
    rentDays: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { session: null, error: 'Not authenticated' };

    const rentDateObj = JSON.parse(bookingData.rentDate);
    const { available } = await checkCarAvailability(bookingData.car.id, rentDateObj['pickup-date']);
    if (!available) {
        return { session: null, error: 'This vehicle is no longer available for your selected dates. Another booking was made while you were browsing.' };
    }

    const { data, error } = await supabase
        .from('payment_sessions')
        .insert({
            user_id: user.id,
            car_id: bookingData.car.id,
            amount: bookingData.totalPrice,
            booking_data: bookingData,
            status: 'pending',
        })
        .select()
        .single();

    if (error) return { session: null, error: error.message };
    return { session: data, error: null };
}
