ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS original_invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS original_invoice_date DATE;
