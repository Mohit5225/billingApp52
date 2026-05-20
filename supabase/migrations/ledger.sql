-- ==========================================
-- PHASE 2: LEDGERS & SIDEKICKS (Final Architecture)
-- ==========================================

-- ==========================================
-- 1. CREATE ENUMS
-- ==========================================
CREATE TYPE public.dr_cr_type   AS ENUM ('Dr', 'Cr');
CREATE TYPE public.gst_reg_type AS ENUM ('Regular', 'Composition', 'Unregistered', 'Consumer');
CREATE TYPE public.tax_type     AS ENUM ('GST', 'TDS', 'TCS', 'VAT', 'Others');

-- ==========================================
-- 2. BASE TABLE: ledgers
-- ==========================================
CREATE TABLE public.ledgers (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id  UUID REFERENCES public.firms(id)          ON DELETE CASCADE  NOT NULL,
    group_id UUID REFERENCES public.account_groups(id) ON DELETE RESTRICT NOT NULL,

    name  TEXT NOT NULL,
    alias TEXT,

    opening_balance      NUMERIC(15, 2)       NOT NULL DEFAULT 0.00,
    opening_balance_type public.dr_cr_type    NOT NULL,

    -- Tally flags
    inventory_values_affected BOOLEAN NOT NULL DEFAULT false,
    cost_centre_applicable    BOOLEAN NOT NULL DEFAULT false,
    is_system                 BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensures a CA doesn't accidentally create two ledgers with the same name
    CONSTRAINT uq_ledger_name_per_firm UNIQUE (name, firm_id)
);

-- Claude's optimized phonebook index: instant lookups and automatic alphabetical sorting per firm
CREATE INDEX idx_ledgers_firm_name ON public.ledgers(firm_id, name);
CREATE INDEX idx_ledgers_group     ON public.ledgers(group_id);


-- ==========================================
-- 3. SIDEKICK A: ledger_party_details
-- ==========================================
CREATE TABLE public.ledger_party_details (
    ledger_id UUID PRIMARY KEY REFERENCES public.ledgers(id) ON DELETE CASCADE,

    maintain_bill_by_bill BOOLEAN NOT NULL DEFAULT false,
    default_credit_days   INTEGER          DEFAULT 0,

    mailing_name TEXT,
    address      TEXT,
    state        TEXT,
    country      TEXT DEFAULT 'India',
    pincode      TEXT,

    pan_number            TEXT,
    gst_registration_type public.gst_reg_type,
    gstin                 TEXT
);


-- ==========================================
-- 4. SIDEKICK B: ledger_bank_details
-- ==========================================
CREATE TABLE public.ledger_bank_details (
    ledger_id UUID PRIMARY KEY REFERENCES public.ledgers(id) ON DELETE CASCADE,

    account_number TEXT,
    ifsc_code      TEXT,
    swift_code     TEXT,
    bank_name      TEXT,
    branch_name    TEXT
);


-- ==========================================
-- 5. SIDEKICK C: ledger_tax_details
-- ==========================================
CREATE TABLE public.ledger_tax_details (
    ledger_id UUID PRIMARY KEY REFERENCES public.ledgers(id) ON DELETE CASCADE,

    duty_tax_type  public.tax_type NOT NULL,
    tax_percentage NUMERIC(5, 2)   NOT NULL DEFAULT 0.00
);


-- ==========================================
-- 6. TRIGGERS (Auto-Update timestamps)
-- ==========================================
-- Base table update trigger
CREATE TRIGGER trg_update_ledgers_updated_at
BEFORE UPDATE ON public.ledgers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to let sidekicks "touch" the parent ledger's updated_at clock
CREATE OR REPLACE FUNCTION touch_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ledgers 
    SET updated_at = timezone('utc'::text, now()) 
    WHERE id = COALESCE(NEW.ledger_id, OLD.ledger_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Sidekick triggers
CREATE TRIGGER trg_touch_party_details AFTER INSERT OR UPDATE OR DELETE ON public.ledger_party_details FOR EACH ROW EXECUTE FUNCTION touch_ledger_updated_at();
CREATE TRIGGER trg_touch_bank_details  AFTER INSERT OR UPDATE OR DELETE ON public.ledger_bank_details  FOR EACH ROW EXECUTE FUNCTION touch_ledger_updated_at();
CREATE TRIGGER trg_touch_tax_details   AFTER INSERT OR UPDATE OR DELETE ON public.ledger_tax_details   FOR EACH ROW EXECUTE FUNCTION touch_ledger_updated_at();


-- ==========================================
-- 7. RLS POLICIES (Pure SQL & System Safe)
-- ==========================================
ALTER TABLE public.ledgers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_party_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_bank_details  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_tax_details   ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- BASE TABLE POLICIES
-- ------------------------------------------
CREATE POLICY "ledgers_select" ON public.ledgers FOR SELECT TO authenticated
USING (
    firm_id = (SELECT get_user_firm_id())
    OR (
        (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
        AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

CREATE POLICY "ledgers_insert" ON public.ledgers FOR INSERT TO authenticated
WITH CHECK (
    is_system = false -- Prevents forged system ledgers
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

CREATE POLICY "ledgers_update" ON public.ledgers FOR UPDATE TO authenticated
USING (
    is_system = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
)
WITH CHECK (
    is_system = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

CREATE POLICY "ledgers_delete" ON public.ledgers FOR DELETE TO authenticated
USING (
    is_system = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- ------------------------------------------
-- SIDEKICK POLICIES (Highly performant pure SQL)
-- ------------------------------------------
CREATE POLICY "party_details_access" ON public.ledger_party_details FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.ledgers 
        WHERE public.ledgers.id = public.ledger_party_details.ledger_id
        AND (
            public.ledgers.firm_id = (SELECT get_user_firm_id())
            OR (
                (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
                AND public.ledgers.firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
            )
        )
    )
);

CREATE POLICY "bank_details_access" ON public.ledger_bank_details FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.ledgers 
        WHERE public.ledgers.id = public.ledger_bank_details.ledger_id
        AND (
            public.ledgers.firm_id = (SELECT get_user_firm_id())
            OR (
                (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
                AND public.ledgers.firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
            )
        )
    )
);

CREATE POLICY "tax_details_access" ON public.ledger_tax_details FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.ledgers 
        WHERE public.ledgers.id = public.ledger_tax_details.ledger_id
        AND (
            public.ledgers.firm_id = (SELECT get_user_firm_id())
            OR (
                (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
                AND public.ledgers.firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
            )
        )
    )
);