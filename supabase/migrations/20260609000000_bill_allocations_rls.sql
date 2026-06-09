-- ============================================================
-- BILL ALLOCATIONS — RLS POLICIES
-- (Run AFTER creating the bill_allocations table)
-- ============================================================

ALTER TABLE public.bill_allocations ENABLE ROW LEVEL SECURITY;

-- Select: same tenant + CA pattern as vouchers
CREATE POLICY "tenant_select_bill_alloc" ON public.bill_allocations FOR SELECT TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR (
        (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
        AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- Insert
CREATE POLICY "tenant_insert_bill_alloc" ON public.bill_allocations FOR INSERT TO authenticated
WITH CHECK (
    (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- Update
CREATE POLICY "tenant_update_bill_alloc" ON public.bill_allocations FOR UPDATE TO authenticated
USING (
    (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- Delete
CREATE POLICY "tenant_delete_bill_alloc" ON public.bill_allocations FOR DELETE TO authenticated
USING (
    (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);
