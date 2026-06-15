-- Fix firms_update RLS policy: CA Admins & Employees can edit ANY firm, Merchants can edit their OWN firm only.
DROP POLICY IF EXISTS "firms_update" ON public.firms;

CREATE POLICY "firms_update" ON public.firms FOR UPDATE TO authenticated
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') OR 
    id = get_user_firm_id()
)
WITH CHECK (
    get_user_role() IN ('ca_admin', 'ca_employee') OR 
    id = get_user_firm_id()
);


