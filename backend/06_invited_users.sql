-- 06_invited_users.sql
-- Run this script in the Supabase SQL Editor

-- 1. Create the invited_users table
CREATE TABLE IF NOT EXISTS invited_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on the new table
ALTER TABLE invited_users ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for the invited_users table
-- Only CA Admins and CA Employees should be able to view, insert, or delete from this table
-- We assume roles are stored in the `profiles` table.
DROP POLICY IF EXISTS "Allow CA Admins and CA Employees to view invited_users" ON invited_users;
CREATE POLICY "Allow CA Admins and CA Employees to view invited_users"
    ON invited_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ca_admin', 'ca_employee')
        )
    );

DROP POLICY IF EXISTS "Allow CA Admins and CA Employees to insert invited_users" ON invited_users;
CREATE POLICY "Allow CA Admins and CA Employees to insert invited_users"
    ON invited_users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ca_admin', 'ca_employee')
        )
    );

DROP POLICY IF EXISTS "Allow CA Admins and CA Employees to delete invited_users" ON invited_users;
CREATE POLICY "Allow CA Admins and CA Employees to delete invited_users"
    ON invited_users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ca_admin', 'ca_employee')
        )
    );

-- 4. Create the function and trigger to block uninvited signups
CREATE OR REPLACE FUNCTION check_invite_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the email being inserted into auth.users exists in the invited_users table
    IF NOT EXISTS (SELECT 1 FROM public.invited_users WHERE email = NEW.email) THEN
        -- Throw a clear error message that we can catch on the frontend
        RAISE EXCEPTION 'INVITE_ONLY_ERROR: Email % is not invited.', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the BEFORE INSERT trigger to auth.users
DROP TRIGGER IF EXISTS ensure_invited_user ON auth.users;
CREATE TRIGGER ensure_invited_user
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION check_invite_status();
