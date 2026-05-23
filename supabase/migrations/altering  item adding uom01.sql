ALTER TABLE public.items
    -- 1. Replace the fake UOM with the real UOM table link
    DROP COLUMN uom,
    ADD COLUMN uom_id UUID NOT NULL,
    ADD CONSTRAINT fk_items_uom_cross_tenant 
        FOREIGN KEY (uom_id, firm_id) 
        REFERENCES public.uom(id, firm_id) 
        ON DELETE RESTRICT,

    -- 2. Add the Alias (from the Tally screenshot)
    ADD COLUMN alias TEXT,
    ADD CONSTRAINT uq_item_alias_per_firm UNIQUE (firm_id, alias),

    -- 3. Add GST Applicability toggle
    ADD COLUMN is_gst_applicable BOOLEAN NOT NULL DEFAULT true,

    -- 4. Add Opening Balances (Crucial for Day-1 onboarding)
    ADD COLUMN opening_quantity NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN opening_rate     NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN opening_value    NUMERIC(15,2) NOT NULL DEFAULT 0.00;

-- Index the alias for fast voucher searching
CREATE INDEX idx_items_alias ON public.items(firm_id, alias);