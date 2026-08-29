'use server';
import { createClient } from '@/lib/supabase/server';

/**
 * Check if a car is available for the given date range.
 * date_range format: "Jul 28, 2026 - Jul 30, 2026"
 * Returns { available: boolean, conflictingBookings: array }
 */
export async function checkCarAvailability(carId: number, requestedDateRange: string): Promise<{
    available: boolean;
    conflictingBookings: { id: number; date_range: string; status: string }[];
}> {
    const supabase = await createClient();
    
    // Parse the requested date range
    const parts = requestedDateRange.split(' - ');
    if (parts.length !== 2) return { available: true, conflictingBookings: [] };
    
    const requestedStart = new Date(parts[0].trim());
    const requestedEnd = new Date(parts[1].trim());
    
    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
        return { available: true, conflictingBookings: [] };
    }
    
    // Fetch all active bookings for this car
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, date_range, status')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed', 'active']);
    
    if (!bookings || bookings.length === 0) {
        return { available: true, conflictingBookings: [] };
    }
    
    // Check each booking for date overlap
    const conflicting = bookings.filter(booking => {
        const bParts = booking.date_range.split(' - ');
        if (bParts.length !== 2) return false;
        
        const bookingStart = new Date(bParts[0].trim());
        const bookingEnd = new Date(bParts[1].trim());
        
        if (isNaN(bookingStart.getTime()) || isNaN(bookingEnd.getTime())) return false;
        
        // Overlap check: two ranges overlap if start1 < end2 AND start2 < end1
        return requestedStart < bookingEnd && bookingStart < requestedEnd;
    });
    
    return {
        available: conflicting.length === 0,
        conflictingBookings: conflicting
    };
}
