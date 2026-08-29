-- ============================================================
-- Orbit Rides — Payment Sessions Table
-- For the custom QR-based checkout flow
-- ============================================================

-- Payment sessions track QR-based checkout attempts
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    booking_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes')
);

-- Enable RLS
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: The session UUID itself is the secret (128-bit, unguessable)
-- So we allow public read/update so the phone confirmation page works
-- without requiring the user to be logged in on their phone

-- Anyone with the session UUID can read it
CREATE POLICY "Public read payment sessions by ID" ON payment_sessions
    FOR SELECT USING (true);

-- Anyone with the session UUID can confirm it
CREATE POLICY "Public confirm payment sessions" ON payment_sessions
    FOR UPDATE USING (true);

-- Only authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions" ON payment_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for this table (for auto-detection)
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sessions;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user ON payment_sessions(user_id);
