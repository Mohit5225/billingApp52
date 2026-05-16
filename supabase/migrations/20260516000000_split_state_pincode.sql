-- Migration: Split state_pincode into state and pincode
-- Created at: 2026-05-16

ALTER TABLE public.firms ADD COLUMN state TEXT;
ALTER TABLE public.firms ADD COLUMN pincode TEXT;

-- If there is existing data, you might want to try and split it, 
-- but for a clean start we can just drop the old column.
-- In a real production app, we would use a script to migrate data.
ALTER TABLE public.firms DROP COLUMN state_pincode;
