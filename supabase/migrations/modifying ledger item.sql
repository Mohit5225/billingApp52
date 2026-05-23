ALTER TABLE public.ledgers
    ADD CONSTRAINT uq_ledgers_id_firm UNIQUE (id, firm_id);

ALTER TABLE public.items
    ADD CONSTRAINT uq_items_id_firm UNIQUE (id, firm_id);