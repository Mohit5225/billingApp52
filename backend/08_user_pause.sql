-- 08_user_pause.sql
-- Add is_paused column to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- We could also add a policy here, but for now we enforce it in frontend and backend endpoints.
