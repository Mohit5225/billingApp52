-- Add details to Firms table for onboarding flow

ALTER TABLE public.firms 
ADD COLUMN mailing_name TEXT NOT NULL,
ADD COLUMN address_lane1 TEXT NOT NULL,
ADD COLUMN city TEXT NOT NULL,
ADD COLUMN state_pincode TEXT NOT NULL,
ADD COLUMN mobile TEXT NOT NULL,
ADD COLUMN email TEXT,
ADD COLUMN registration_type TEXT DEFAULT 'Regular' NOT NULL,
ADD COLUMN gstin TEXT NOT NULL,
ADD COLUMN pan TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN branch_name TEXT;

-- Update existing firms (optional, if any exist)
-- UPDATE public.firms SET registration_type = 'Regular' WHERE registration_type IS NULL;
