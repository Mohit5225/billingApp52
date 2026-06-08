-- Multi-Firm Merchant Support: Phase 5 (RLS Policies)
-- Run this script in the Supabase SQL Editor

-- ============================================================================
-- IMPORTANT: The 'firms' RLS policy needs a helper function because it must
-- query the 'firms' table itself (to check parent_firm_id for CA users).
-- A direct subquery on 'firms' inside a policy ON 'firms' causes infinite
-- recursion. The SECURITY DEFINER function bypasses RLS for that lookup.
-- ============================================================================

-- 1. Create a helper function that checks if a user can see a given firm.
--    SECURITY DEFINER = runs as the function owner (bypasses RLS).
--    LANGUAGE plpgsql  = prevents PostgreSQL from inlining (which would
--                        re-apply RLS and cause recursion).
CREATE OR REPLACE FUNCTION can_access_firm(check_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_firm_id UUID;
BEGIN
  -- Get caller's profile
  SELECT role, firm_id INTO user_role, user_firm_id
  FROM profiles
  WHERE id = auth.uid();

  -- CA users: God Mode (sees all firms)
  IF user_role IN ('ca_admin', 'ca_employee') THEN
    RETURN TRUE;
  END IF;

  -- Merchants: must have explicit access via the junction table
  RETURN EXISTS (
    SELECT 1 FROM user_firm_access
    WHERE user_id = auth.uid() AND firm_id = check_firm_id
  );
END;
$$;

-- 2. Drop any existing SELECT policies on firms.
--    Adjust these names if your existing policies are named differently.
--    Run: SELECT policyname FROM pg_policies WHERE tablename = 'firms';
DROP POLICY IF EXISTS "Enable read access for all users" ON firms;
DROP POLICY IF EXISTS "Users can view their own firm" ON firms;
DROP POLICY IF EXISTS "Users see accessible firms" ON firms;

-- 3. Create the new multi-firm aware policy using the helper function.
CREATE POLICY "Users see accessible firms"
  ON firms FOR SELECT
  USING ( can_access_firm(id) );

-- Note: No policy changes needed for ledgers, vouchers, items, etc.
-- as long as the frontend fetches those exclusively via the FastAPI backend
-- (which enforces access via Python code and the service-role key).
