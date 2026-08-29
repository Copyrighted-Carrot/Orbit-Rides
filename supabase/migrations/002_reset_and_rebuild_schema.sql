-- ============================================================
-- Orbit Rides — Reset & Rebuild Public Database Schema (Fixed RLS)
-- ============================================================
-- IMPORTANT: This script will drop non-auth public tables and
-- recreate all 10 tables required by Orbit Rides.
-- Your user accounts in `auth.users` WILL BE PRESERVED.
--
-- Instructions:
-- 1. Copy this entire script.
-- 2. Open your Supabase Project Dashboard -> SQL Editor.
-- 3. Paste and click "Run".
-- ============================================================

-- Step 1: DROP EXISTING PUBLIC TABLES (CASCADE)
DROP TABLE IF EXISTS public.recently_viewed CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.discount_codes CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.cars CASCADE;
DROP TABLE IF EXISTS public.car_types CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop existing functions/triggers if present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- ============================================================
-- 1. USER ROLES & IS_ADMIN HELPER (SECURITY DEFINER)
-- ============================================================
CREATE TABLE public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SECURITY DEFINER function bypasses RLS on user_roles to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Service role manages roles"
    ON public.user_roles FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-assign role trigger on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        COALESCE(
            CASE 
                WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
                ELSE 'customer'
            END,
            'customer'
        )
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users into user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, COALESCE(
    CASE 
        WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        ELSE 'customer'
    END,
    'customer'
)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. CAR TYPES
-- ============================================================
CREATE TABLE public.car_types (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE
);

ALTER TABLE public.car_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view car types"
    ON public.car_types FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage car types"
    ON public.car_types FOR ALL
    USING (public.is_admin());

-- Seed initial car types
INSERT INTO public.car_types (id, type) VALUES
    (1, 'Diesel'),
    (2, 'Petrol'),
    (3, 'Electric'),
    (4, 'Sedan'),
    (5, 'SUV'),
    (6, 'Sports'),
    (7, 'Luxury'),
    (8, 'Convertible')
ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type;

-- Reset identity sequence for car_types
SELECT setval(pg_get_serial_sequence('public.car_types', 'id'), COALESCE(MAX(id), 1)) FROM public.car_types;

-- ============================================================
-- 3. CARS INVENTORY
-- ============================================================
CREATE TABLE public.cars (
    id SERIAL PRIMARY KEY,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    type_id INTEGER NOT NULL REFERENCES public.car_types(id) ON DELETE RESTRICT,
    price_per_day NUMERIC(10,2) NOT NULL,
    fuel INTEGER NOT NULL DEFAULT 100,
    seats INTEGER NOT NULL DEFAULT 4,
    color TEXT NOT NULL DEFAULT '#000000',
    img_urls TEXT[] DEFAULT '{}',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    horsepower INTEGER,
    torque TEXT,
    engine_type TEXT,
    transmission TEXT DEFAULT 'Automatic',
    drivetrain TEXT DEFAULT 'RWD',
    zero_to_sixty NUMERIC(4,1),
    top_speed INTEGER,
    fuel_capacity NUMERIC(5,1),
    mileage NUMERIC(5,1),
    year INTEGER,
    description TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    luggage_capacity INTEGER,
    features TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cars"
    ON public.cars FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert cars"
    ON public.cars FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cars"
    ON public.cars FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete cars"
    ON public.cars FOR DELETE
    USING (public.is_admin());

-- ============================================================
-- 4. BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkout_id TEXT NOT NULL,
    date_range TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    pickup_time INTEGER NOT NULL,
    pickup_time_formatted TEXT,
    dropoff_time TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    total_price NUMERIC(10,2),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    booking_ref TEXT UNIQUE,
    discount_code TEXT,
    notes TEXT,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
    ON public.bookings FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Users can create own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all bookings"
    ON public.bookings FOR UPDATE
    USING (public.is_admin());

-- Auto-generate booking_ref on insert
CREATE OR REPLACE FUNCTION public.set_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_ref IS NULL THEN
        NEW.booking_ref := 'ORB-' || LPAD(NEW.id::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_ref
    BEFORE INSERT ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_booking_ref();

-- ============================================================
-- 5. USER PROFILES
-- ============================================================
CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone TEXT,
    license_number TEXT,
    license_expiry DATE,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Auto-create user profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_profile_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill user_profiles for existing auth.users
INSERT INTO public.user_profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', email)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 6. REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
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
-- 7. WISHLISTS
-- ============================================================
CREATE TABLE public.wishlists (
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
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
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
-- 9. RECENTLY VIEWED
-- ============================================================
CREATE TABLE public.recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recently viewed"
    ON public.recently_viewed FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- 10. DISCOUNT CODES
-- ============================================================
CREATE TABLE public.discount_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent NUMERIC(5,2) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active discount codes"
    ON public.discount_codes FOR SELECT
    USING (is_active = true AND now() BETWEEN valid_from AND valid_to);

CREATE POLICY "Admins can manage discount codes"
    ON public.discount_codes FOR ALL
    USING (public.is_admin());

-- Seed sample discount codes
INSERT INTO public.discount_codes (code, discount_percent, valid_from, valid_to) VALUES
    ('ORBIT10', 10.00, now(), now() + INTERVAL '1 year'),
    ('WELCOME20', 20.00, now(), now() + INTERVAL '1 year')
ON CONFLICT (code) DO NOTHING;

-- Done! All 10 public tables recreated with infinite-recursion-free RLS policies.
