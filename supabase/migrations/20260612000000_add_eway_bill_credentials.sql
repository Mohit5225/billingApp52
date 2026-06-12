-- Add E-way Bill credentials to firms table
ALTER TABLE firms ADD COLUMN IF NOT EXISTS eway_bill_username TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS eway_bill_password TEXT;
