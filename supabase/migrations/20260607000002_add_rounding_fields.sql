-- Migration to add rounding fields to ledgers table

ALTER TABLE public.ledgers
ADD COLUMN rounding_method text,
ADD COLUMN rounding_limit numeric DEFAULT 1;

-- If you have views dependent on this, you might need to recreate them, but typically this is enough.
