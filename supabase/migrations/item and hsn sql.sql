-- ============================================================
-- PHASE 2.5: STATUTORY RULES (HSN) & INVENTORY (ITEMS) - FINAL
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────
CREATE TYPE public.gst_taxability AS ENUM ('Taxable', 'Nil Rated', 'Exempt', 'Zero Rated', 'Non-GST');
CREATE TYPE public.cess_type AS ENUM ('none', 'ad_valorem', 'specific', 'compound');


-- ── 2. HSN / SAC MASTER ─────────────────────────────────────
CREATE TABLE public.hsn_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    
    hsn_code    TEXT NOT NULL CHECK (hsn_code ~ '^\d{2,8}$'),
    description TEXT,
    code_type   TEXT NOT NULL DEFAULT 'HSN' CHECK (code_type IN ('HSN', 'SAC')),
    
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Rule: One HSN per firm.
    CONSTRAINT uq_hsn_per_firm UNIQUE (firm_id, hsn_code),
    
    -- GUARD: Required to allow the composite Foreign Key from the items table
    CONSTRAINT uq_hsn_id_firm UNIQUE (id, firm_id)
);

CREATE INDEX idx_hsn_codes_firm ON public.hsn_codes(firm_id);

CREATE TRIGGER trg_update_hsn_codes_updated_at
BEFORE UPDATE ON public.hsn_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 3. ITEMS MASTER (With Tax Rates) ────────────────────────
CREATE TABLE public.items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id       UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    hsn_id        UUID NOT NULL,

    name          TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('Goods', 'Services')),
    uom           TEXT NOT NULL, -- Free text for now, master table later
    default_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    
    -- TAX RATES (Moved from HSN to Item level per your logic)
    is_rcm                BOOLEAN NOT NULL DEFAULT false,
    taxability            public.gst_taxability NOT NULL DEFAULT 'Taxable',
    igst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cgst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    sgst_rate             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cess_type             public.cess_type NOT NULL DEFAULT 'none',
    cess_percent          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cess_amount_per_unit  NUMERIC(15,2) NOT NULL DEFAULT 0.00,

    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- GUARD: Physically blocks Firm A's item from pointing to Firm B's HSN
    CONSTRAINT fk_items_hsn_cross_tenant 
        FOREIGN KEY (hsn_id, firm_id) 
        REFERENCES public.hsn_codes(id, firm_id) 
        ON DELETE RESTRICT,

    CONSTRAINT uq_item_name_per_firm UNIQUE (name, firm_id),
    
    CONSTRAINT cgst_sgst_math CHECK (
        cgst_rate = sgst_rate AND 
        ROUND(cgst_rate + sgst_rate, 2) = ROUND(igst_rate, 2)
    )
);

CREATE INDEX idx_items_firm_name ON public.items(firm_id, name);
CREATE INDEX idx_items_hsn_id ON public.items(hsn_id);

CREATE TRIGGER trg_update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 4. RLS POLICIES (For Both Tables) ───────────────────────
ALTER TABLE public.hsn_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Select
CREATE POLICY "tenant_select_hsn" ON public.hsn_codes FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_select_items" ON public.items FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()) OR ((SELECT get_user_role()) IN ('ca_admin', 'ca_employee') AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

-- Insert/Update/Delete (CA Admin only)
CREATE POLICY "tenant_modify_hsn" ON public.hsn_codes FOR ALL TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));

CREATE POLICY "tenant_modify_items" ON public.items FOR ALL TO authenticated
USING ((SELECT get_user_role()) = 'ca_admin' AND (firm_id = (SELECT get_user_firm_id()) OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))));