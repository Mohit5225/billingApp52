-- Multi-Firm Merchant Support: Phase 1 Migration
-- Run this script in the Supabase SQL Editor

-- 1. Create the junction table mapping users to firms
CREATE TABLE IF NOT EXISTS user_firm_access (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id    UUID NOT NULL REFERENCES firms(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, firm_id)  -- a user can only have one access row per firm
);

-- 2. Enable RLS on the new table
ALTER TABLE user_firm_access ENABLE ROW LEVEL SECURITY;

-- 3. Create the SELECT policy (users can only see their own access rows)
DROP POLICY IF EXISTS "Users see own access rows" ON user_firm_access;
CREATE POLICY "Users see own access rows"
  ON user_firm_access FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Backfill: Create access rows for all existing users
-- Every existing profile currently has a firm_id, so we link them explicitly here.
-- ON CONFLICT DO NOTHING ensures it is safe to run this multiple times.
INSERT INTO user_firm_access (user_id, firm_id)
SELECT id, firm_id FROM profiles
ON CONFLICT (user_id, firm_id) DO NOTHING;

-- Verification query (optional): 
-- Run this after to see how many rows were created
-- SELECT count(*) FROM user_firm_access;
