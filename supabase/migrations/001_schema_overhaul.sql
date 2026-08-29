-- ============================================================
-- Orbit Rides — Schema Overhaul Migration
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- This migration:
--   1. Creates user_roles table with RLS (fixes privilege escalation)
--   2. Expands cars table with full vehicle specs
--   3. Expands bookings table with status tracking
--   4. Creates new tables: reviews, wishlists, notifications,
--      user_profiles, recently_viewed, discount_codes
-- ============================================================

-- ============================================================
-- 1. USER ROLES (Security Fix)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can read own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- Only service_role can insert/update roles (not the client)
CREATE POLICY "Service role manages roles"
    ON public.user_roles FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-assign 'customer' role on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, COALESCE(
    CASE 
        WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        WHEN raw_user_meta_data->>'role' = 'both' THEN 'admin'
        ELSE 'customer'
    END,
    'customer'
)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. EXPAND CARS TABLE
-- ============================================================
ALTER TABLE public.cars
    ADD COLUMN IF NOT EXISTS horsepower INTEGER,
    ADD COLUMN IF NOT EXISTS torque TEXT,
    ADD COLUMN IF NOT EXISTS engine_type TEXT,
    ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'Automatic',
    ADD COLUMN IF NOT EXISTS drivetrain TEXT DEFAULT 'RWD',
    ADD COLUMN IF NOT EXISTS zero_to_sixty NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS top_speed INTEGER,
    ADD COLUMN IF NOT EXISTS fuel_capacity NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS mileage NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS year INTEGER,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS luggage_capacity INTEGER,
    ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available' 
        CHECK (status IN ('available', 'rented', 'maintenance')),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================
-- 3. EXPAND BOOKINGS TABLE
-- ============================================================
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    ADD COLUMN IF NOT EXISTS pickup_time_formatted TEXT,
    ADD COLUMN IF NOT EXISTS dropoff_time TEXT,
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS discount_code TEXT,
    ADD COLUMN IF NOT EXISTS booking_ref TEXT UNIQUE;

-- Generate booking reference for existing bookings
UPDATE public.bookings 
SET booking_ref = 'ORB-' || LPAD(id::text, 6, '0')
WHERE booking_ref IS NULL;

-- ============================================================
-- 4. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone TEXT,
    license_number TEXT,
    license_expiry DATE,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_profile_created ON auth.users;
CREATE TRIGGER on_auth_user_profile_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================
-- 5. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES public.bookings(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create own reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
    ON public.reviews FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- 6. WISHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, car_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
    ON public.wishlists FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'booking', 'review', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- 8. RECENTLY VIEWED
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recently viewed"
    ON public.recently_viewed FOR ALL
    USING (auth.uid() = user_id);

-- Keep only last 10 viewed per user (cleanup function)
CREATE OR REPLACE FUNCTION public.cleanup_recently_viewed()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.recently_viewed
    WHERE id NOT IN (
        SELECT id FROM public.recently_viewed
        WHERE user_id = NEW.user_id
        ORDER BY viewed_at DESC
        LIMIT 10
    ) AND user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_recently_viewed_insert ON public.recently_viewed;
CREATE TRIGGER on_recently_viewed_insert
    AFTER INSERT ON public.recently_viewed
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_recently_viewed();

-- ============================================================
-- 9. DISCOUNT CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ NOT NULL,
    max_uses INTEGER DEFAULT 100,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active discount codes"
    ON public.discount_codes FOR SELECT
    USING (is_active = true AND valid_to > now());

-- ============================================================
-- 10. HELPER: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cars_updated_at ON public.cars;
CREATE TRIGGER cars_updated_at
    BEFORE UPDATE ON public.cars
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 11. BOOKING NOTIFICATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            NEW.user_id,
            'booking',
            'Booking Confirmed!',
            'Your booking ' || COALESCE(NEW.booking_ref, '#' || NEW.id) || ' has been confirmed.',
            '/customer/bookings'
        );
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (
            NEW.user_id,
            'warning',
            'Booking Cancelled',
            'Your booking ' || COALESCE(NEW.booking_ref, '#' || NEW.id) || ' has been cancelled.',
            '/customer/bookings'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status();
