-- Migration: Add prefix settings to firms table
-- Created at: 2026-06-04

ALTER TABLE public.firms 
ADD COLUMN IF NOT EXISTS sales_prefix TEXT,
ADD COLUMN IF NOT EXISTS purchase_prefix TEXT,
ADD COLUMN IF NOT EXISTS payment_prefix TEXT,
ADD COLUMN IF NOT EXISTS receipt_prefix TEXT;
