ALTER TABLE public.uom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_uom" ON public.uom FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_insert_uom" ON public.uom FOR INSERT TO authenticated
WITH CHECK ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_update_uom" ON public.uom FOR UPDATE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_delete_uom" ON public.uom FOR DELETE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));