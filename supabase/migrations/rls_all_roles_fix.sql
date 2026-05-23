-- ============================================================
-- RLS POLICY UPDATE: Allow all roles to CRUD business data
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
-- Permission model:
--   ca_admin, ca_employee, merchant → full CRUD on UOM/HSN/Items/Vouchers
--   ca_admin only                   → delete firms, manage users
-- ============================================================


-- ── 1. UOM ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "tenant_insert_uom" ON public.uom;
DROP POLICY IF EXISTS "tenant_update_uom" ON public.uom;
DROP POLICY IF EXISTS "tenant_delete_uom" ON public.uom;

CREATE POLICY "tenant_insert_uom" ON public.uom FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_uom" ON public.uom FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_uom" ON public.uom FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);


-- ── 2. HSN Codes ─────────────────────────────────────────────

DROP POLICY IF EXISTS "tenant_modify_hsn" ON public.hsn_codes;

-- Replace the old ALL policy with split INSERT/UPDATE/DELETE (more control)
CREATE POLICY "tenant_insert_hsn" ON public.hsn_codes FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_hsn" ON public.hsn_codes FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_hsn" ON public.hsn_codes FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);


-- ── 3. Items ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "tenant_modify_items" ON public.items;

CREATE POLICY "tenant_insert_items" ON public.items FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_items" ON public.items FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_items" ON public.items FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);


-- ── 4. Vouchers ───────────────────────────────────────────────

DROP POLICY IF EXISTS "tenant_insert_vouchers"   ON public.vouchers;
DROP POLICY IF EXISTS "tenant_update_vouchers"   ON public.vouchers;
DROP POLICY IF EXISTS "tenant_delete_vouchers"   ON public.vouchers;

CREATE POLICY "tenant_insert_vouchers" ON public.vouchers FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_vouchers" ON public.vouchers FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_vouchers" ON public.vouchers FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);


-- ── 5. Voucher Accounting Lines ───────────────────────────────

DROP POLICY IF EXISTS "tenant_insert_acc_lines" ON public.voucher_accounting_lines;
DROP POLICY IF EXISTS "tenant_update_acc_lines" ON public.voucher_accounting_lines;
DROP POLICY IF EXISTS "tenant_delete_acc_lines" ON public.voucher_accounting_lines;

CREATE POLICY "tenant_insert_acc_lines" ON public.voucher_accounting_lines FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_acc_lines" ON public.voucher_accounting_lines FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_acc_lines" ON public.voucher_accounting_lines FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);


-- ── 6. Voucher Inventory Lines ────────────────────────────────

DROP POLICY IF EXISTS "tenant_insert_inv_lines" ON public.voucher_inventory_lines;
DROP POLICY IF EXISTS "tenant_update_inv_lines" ON public.voucher_inventory_lines;
DROP POLICY IF EXISTS "tenant_delete_inv_lines" ON public.voucher_inventory_lines;

CREATE POLICY "tenant_insert_inv_lines" ON public.voucher_inventory_lines FOR INSERT TO authenticated
WITH CHECK (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_update_inv_lines" ON public.voucher_inventory_lines FOR UPDATE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);

CREATE POLICY "tenant_delete_inv_lines" ON public.voucher_inventory_lines FOR DELETE TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
);
