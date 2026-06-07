-- Migration to add type_of_ledger column to ledgers table

ALTER TABLE public.ledgers
ADD COLUMN type_of_ledger text NOT NULL DEFAULT 'Not Applicable';

-- If you have views dependent on this, you might need to recreate them, but typically this is enough.
