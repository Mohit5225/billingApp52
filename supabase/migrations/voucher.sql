 

-- ============================================================
-- PHASE 3: VOUCHERS (FINAL BULLETPROOF SCHEMA)
-- ============================================================

CREATE TYPE public.voucher_category AS ENUM (
    'Sales', 'Purchase', 'Receipt', 'Payment', 'Contra', 'Journal', 'Debit Note', 'Credit Note'
);

-- ── 1. VOUCHERS (Header) ─────────────────────────────────────
CREATE TABLE public.vouchers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id           UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,

    party_ledger_id   UUID,

    category          public.voucher_category NOT NULL,
    voucher_number    TEXT NOT NULL,
    voucher_date      DATE NOT NULL,
    narration         TEXT,
    discount_type     VARCHAR(20) NOT NULL DEFAULT 'percentage',

    is_cancelled      BOOLEAN NOT NULL DEFAULT false,

    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT uq_voucher_number_per_firm UNIQUE (firm_id, category, voucher_number),
    CONSTRAINT uq_vouchers_id_firm UNIQUE (id, firm_id),

    -- Party is mandatory for all categories except Journal & Contra
    CONSTRAINT check_party_required CHECK (
        category IN ('Journal', 'Contra') OR party_ledger_id IS NOT NULL
    ),

    -- Cross-tenant guard
    CONSTRAINT fk_voucher_party_cross_tenant
        FOREIGN KEY (party_ledger_id, firm_id)
        REFERENCES public.ledgers(id, firm_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_vouchers_firm_date     ON public.vouchers(firm_id, voucher_date DESC);
CREATE INDEX idx_vouchers_firm_category ON public.vouchers(firm_id, category);
CREATE INDEX idx_vouchers_party         ON public.vouchers(party_ledger_id);

CREATE TRIGGER trg_update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 2. VOUCHER ACCOUNTING LINES (Dr/Cr Engine) ───────────────
CREATE TABLE public.voucher_accounting_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id      UUID NOT NULL,
    firm_id         UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    ledger_id       UUID NOT NULL,

    line_number     SMALLINT NOT NULL,
    debit_amount    NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    credit_amount   NUMERIC(15,2) NOT NULL DEFAULT 0.00,

    -- Cross-tenant guards
    CONSTRAINT fk_accounting_voucher_cross_tenant
        FOREIGN KEY (voucher_id, firm_id)
        REFERENCES public.vouchers(id, firm_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_accounting_ledger_cross_tenant
        FOREIGN KEY (ledger_id, firm_id)
        REFERENCES public.ledgers(id, firm_id)
        ON DELETE RESTRICT,

    -- Strict single-entry (No ghost zero-lines)
    CONSTRAINT check_single_entry CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    ),

    CONSTRAINT uq_acc_line_number UNIQUE (voucher_id, line_number)
);

CREATE INDEX idx_accounting_lines_voucher ON public.voucher_accounting_lines(voucher_id);
CREATE INDEX idx_accounting_lines_ledger  ON public.voucher_accounting_lines(ledger_id);
CREATE INDEX idx_accounting_lines_firm    ON public.voucher_accounting_lines(firm_id);


-- ── 3. VOUCHER INVENTORY LINES (Tax & Item Engine) ───────────
CREATE TABLE public.voucher_inventory_lines (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id            UUID NOT NULL,
    firm_id               UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    item_id               UUID NOT NULL,

    line_number           SMALLINT NOT NULL,

    -- FROZEN MASTER DATA
    item_name             TEXT NOT NULL,
    hsn_code              TEXT NOT NULL,
    uom                   TEXT NOT NULL,
    taxability            public.gst_taxability NOT NULL,
    is_rcm                BOOLEAN NOT NULL DEFAULT false,

    -- MATH
    quantity              NUMERIC(15,2) NOT NULL,
    unit_price            NUMERIC(15,2) NOT NULL,
    discount_amount       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    taxable_amount        NUMERIC(15,2) NOT NULL,

    -- FROZEN TAX RATES
    igst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cgst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    sgst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cess_percent          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cess_amount_per_unit  NUMERIC(15,2) NOT NULL DEFAULT 0.00,

    -- FROZEN TAX AMOUNTS
    igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    cess_amount           NUMERIC(15,2) NOT NULL DEFAULT 0.00,

    -- Cross-tenant guards
    CONSTRAINT fk_inventory_voucher_cross_tenant
        FOREIGN KEY (voucher_id, firm_id)
        REFERENCES public.vouchers(id, firm_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inventory_item_cross_tenant
        FOREIGN KEY (item_id, firm_id)
        REFERENCES public.items(id, firm_id)
        ON DELETE RESTRICT,

    -- Quantity & Discount Bounds
    CONSTRAINT check_quantity       CHECK (quantity > 0),
    CONSTRAINT check_unit_price     CHECK (unit_price >= 0),
    CONSTRAINT check_discount       CHECK (
        discount_amount >= 0 AND
        discount_amount <= ROUND(quantity * unit_price, 2)
    ),

    -- Taxable Amount Math
    CONSTRAINT check_taxable_amount CHECK (
        ROUND(taxable_amount, 2) = ROUND((quantity * unit_price) - discount_amount, 2)
    ),

    -- Unified GST Type Consistency (Rates & Amounts MUST align)
    CONSTRAINT check_tax_type CHECK (
        -- Inter-state: must be Taxable
        (taxability = 'Taxable' AND igst_rate > 0 AND cgst_rate = 0 AND sgst_rate = 0 AND
         igst_amount >= 0 AND cgst_amount = 0 AND sgst_amount = 0)
        OR
        -- Intra-state: must be Taxable, rates must be equal
        (taxability = 'Taxable' AND igst_rate = 0 AND cgst_rate > 0 AND sgst_rate > 0 AND cgst_rate = sgst_rate AND
         igst_amount = 0 AND cgst_amount >= 0 AND sgst_amount >= 0)
        OR
        -- Non-Taxable: Nil Rated / Exempt / Non-GST / Zero Rated (all rates and amounts = 0)
        (taxability IN ('Nil Rated', 'Exempt', 'Non-GST', 'Zero Rated') AND
         igst_rate = 0 AND cgst_rate = 0 AND sgst_rate = 0 AND
         igst_amount = 0 AND cgst_amount = 0 AND sgst_amount = 0)
    ),

    CONSTRAINT uq_inv_line_number UNIQUE (voucher_id, line_number)
);

CREATE INDEX idx_inventory_lines_voucher ON public.voucher_inventory_lines(voucher_id);
CREATE INDEX idx_inventory_lines_item    ON public.voucher_inventory_lines(item_id);
CREATE INDEX idx_inventory_lines_firm    ON public.voucher_inventory_lines(firm_id);


-- ── 4. RLS POLICIES ──────────────────────────────────────────
ALTER TABLE public.vouchers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_accounting_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_inventory_lines   ENABLE ROW LEVEL SECURITY;

-- Select
CREATE POLICY "tenant_select_vouchers" ON public.vouchers FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_select_acc_lines" ON public.voucher_accounting_lines FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_select_inv_lines" ON public.voucher_inventory_lines FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

-- Insert (WITH CHECK: guards what rows can be written)
CREATE POLICY "tenant_insert_vouchers" ON public.vouchers FOR INSERT TO authenticated
WITH CHECK ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_insert_acc_lines" ON public.voucher_accounting_lines FOR INSERT TO authenticated
WITH CHECK ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_insert_inv_lines" ON public.voucher_inventory_lines FOR INSERT TO authenticated
WITH CHECK ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

-- Update (USING: guards which rows can be targeted)
CREATE POLICY "tenant_update_vouchers" ON public.vouchers FOR UPDATE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_update_acc_lines" ON public.voucher_accounting_lines FOR UPDATE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_update_inv_lines" ON public.voucher_inventory_lines FOR UPDATE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

-- Delete (USING: guards which rows can be deleted)
CREATE POLICY "tenant_delete_vouchers" ON public.vouchers FOR DELETE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_delete_acc_lines" ON public.voucher_accounting_lines FOR DELETE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_delete_inv_lines" ON public.voucher_inventory_lines FOR DELETE TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));