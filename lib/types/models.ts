// ============================================================
// Orbit Rides — Centralized Type Definitions
// Synced with database.types.ts (source of truth: Supabase schema)
// ============================================================

export type Car = {
    id?: number;
    manufacturer: string;
    model: string;
    type_id: number;
    type_display?: string; // Joined from car_types table, not stored in DB
    price_per_day: number;
    fuel: number;
    seats: number;
    color: string;
    img_urls: string[];
    owner_id?: string;
    // Extended specs (Phase 2)
    horsepower?: number | null;
    torque?: string | null;
    engine_type?: string | null;
    transmission?: string | null;
    drivetrain?: string | null;
    zero_to_sixty?: number | null;
    top_speed?: number | null;
    fuel_capacity?: number | null;
    mileage?: number | null;
    year?: number | null;
    description?: string | null;
    is_available?: boolean;
    is_archived?: boolean;
    luggage_capacity?: number | null;
    features?: string[] | null;
    status?: 'available' | 'rented' | 'maintenance';
    created_at?: string;
    updated_at?: string;
};

export type Booking = {
    id?: number;
    car_id: number;
    user_id: string;
    checkout_id: string;
    date_range: string;
    pickup_location: string;
    pickup_time: number;
    pickup_time_formatted?: string | null;
    dropoff_time?: string | null;
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
    total_price?: number | null;
    payment_status: 'pending' | 'paid' | 'refunded';
    booking_ref?: string | null;
    discount_code?: string | null;
    notes?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined fields (not in DB, populated by queries with joins)
    car?: Car;
};

export type Review = {
    id?: number;
    booking_id?: number | null;
    user_id: string;
    car_id: number;
    rating: number;
    comment?: string | null;
    created_at?: string;
    // Joined fields
    user_profile?: UserProfile;
};

export type UserProfile = {
    user_id: string;
    display_name?: string | null;
    phone?: string | null;
    license_number?: string | null;
    license_expiry?: string | null;
    avatar_url?: string | null;
    preferences?: Record<string, unknown> | null;
    created_at?: string;
    updated_at?: string;
};

export type UserRole = {
    user_id: string;
    role: 'customer' | 'admin';
    created_at?: string;
};

export type Notification = {
    id?: number;
    user_id: string;
    type: 'info' | 'success' | 'warning' | 'booking' | 'review' | 'system';
    title: string;
    message: string;
    is_read: boolean;
    link?: string | null;
    created_at?: string;
};

export type DiscountCode = {
    id?: number;
    code: string;
    discount_percent: number;
    valid_from: string;
    valid_to: string;
    max_uses?: number | null;
    current_uses: number;
    is_active: boolean;
    created_at?: string;
};

export type WishlistItem = {
    id?: number;
    user_id: string;
    car_id: number;
    created_at?: string;
    car?: Car;
};

export type RecentlyViewed = {
    id?: number;
    user_id: string;
    car_id: number;
    viewed_at?: string;
    car?: Car;
};