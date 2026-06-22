-- Add discount_type to vouchers table
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage';
