CREATE TABLE public.uom (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL, -- What the user sees: "Pieces", "Kilos"
    uqc_code        TEXT NOT NULL, -- What GST expects: "PCS", "KGS"
    decimal_places  SMALLINT NOT NULL DEFAULT 0, -- PCS = 0, KGS = 2 or 3
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT uq_uom_name_firm UNIQUE (firm_id, name),
    CONSTRAINT uq_uom_id_firm UNIQUE (id, firm_id) -- Required for cross-tenant item link
);

CREATE INDEX idx_uom_firm ON public.uom(firm_id);