-- Fix firms_update RLS policy to respect multi-firm access.
-- Merchants can edit any firm they have access to via the `user_firm_access` table (handled by `can_access_firm`),
-- not just their primary profile firm.

DROP POLICY IF EXISTS "firms_update" ON public.firms;

CREATE POLICY "firms_update" ON public.firms FOR UPDATE TO authenticated
USING (
    can_access_firm(id)
)
WITH CHECK (
    can_access_firm(id)
);
