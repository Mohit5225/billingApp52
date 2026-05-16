-- 1. Update FIRMS Policy: CAs see everything, Merchants see their own.
DROP POLICY IF EXISTS "firms_select" ON public.firms;
CREATE POLICY "firms_select" ON public.firms 
FOR SELECT TO authenticated 
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') 
    OR 
    id = (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);

-- 2. Update INVOICES Policy: CAs see everything, Merchants see their own firm's invoices.
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices 
FOR SELECT TO authenticated 
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') 
    OR 
    firm_id = (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Update PROFILES Policy: CAs can see all profiles, Merchants only see their own.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') 
    OR 
    id = auth.uid()
);

-- 4. Update CUSTOMERS Policy: Global access for CAs.
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers 
FOR SELECT TO authenticated 
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') 
    OR 
    firm_id = (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Update ITEMS Policy: Global access for CAs.
DROP POLICY IF EXISTS "items_select" ON public.items;
CREATE POLICY "items_select" ON public.items 
FOR SELECT TO authenticated 
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') 
    OR 
    firm_id = (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);
