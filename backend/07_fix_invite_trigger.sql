-- 07_fix_invite_trigger.sql
-- Fix the trigger to allow existing users to log in

CREATE OR REPLACE FUNCTION check_invite_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user already exists in auth.users, allow the insert so ON CONFLICT can proceed
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
        RETURN NEW;
    END IF;

    -- Check if the email being inserted into auth.users exists in the invited_users table
    IF NOT EXISTS (SELECT 1 FROM public.invited_users WHERE email = NEW.email) THEN
        -- Throw a clear error message that we can catch on the frontend
        RAISE EXCEPTION 'INVITE_ONLY_ERROR: Email % is not invited.', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
