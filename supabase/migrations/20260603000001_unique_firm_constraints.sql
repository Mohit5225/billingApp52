-- ==========================================
-- 1. Data Cleanup for duplicate Firms
-- ==========================================

-- Identify and append _DUP_ suffix to older duplicate GSTINs (keeping the first one intact)
WITH ranked_firms AS (
    SELECT id, 
           gstin,
           ROW_NUMBER() OVER(PARTITION BY UPPER(TRIM(gstin)) ORDER BY created_at ASC) as rn
    FROM public.firms
    WHERE gstin IS NOT NULL AND TRIM(gstin) != ''
)
UPDATE public.firms
SET gstin = gstin || '_DUP_' || SUBSTRING(id::text, 1, 8)
WHERE id IN (
    SELECT id FROM ranked_firms WHERE rn > 1
);

-- Identify and append _DUP_ suffix to older duplicate PANs (keeping the first one intact)
WITH ranked_firms AS (
    SELECT id, 
           pan,
           ROW_NUMBER() OVER(PARTITION BY UPPER(TRIM(pan)) ORDER BY created_at ASC) as rn
    FROM public.firms
    WHERE pan IS NOT NULL AND TRIM(pan) != ''
)
UPDATE public.firms
SET pan = pan || '_DUP_' || SUBSTRING(id::text, 1, 8)
WHERE id IN (
    SELECT id FROM ranked_firms WHERE rn > 1
);

-- ==========================================
-- 2. Create Global Unique Indexes
-- ==========================================

-- GSTIN uniqueness (ignoring empty strings)
CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_gstin_trim_lower
ON public.firms (UPPER(TRIM(gstin)))
WHERE gstin IS NOT NULL AND TRIM(gstin) != '';

-- PAN uniqueness (ignoring empty strings)
CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_pan_trim_lower
ON public.firms (UPPER(TRIM(pan)))
WHERE pan IS NOT NULL AND TRIM(pan) != '';

-- ==========================================
-- 3. Create Normalization & Validation Trigger
-- ==========================================

CREATE OR REPLACE FUNCTION public.normalize_firm_unique_fields()
RETURNS trigger AS $$
BEGIN
    -- Normalize GSTIN
    IF NEW.gstin IS NOT NULL THEN
        NEW.gstin = UPPER(TRIM(NEW.gstin));
    END IF;

    -- Normalize PAN
    IF NEW.pan IS NOT NULL THEN
        NEW.pan = UPPER(TRIM(NEW.pan));
    END IF;

    -- Pre-validate exact GSTIN matches (to provide a specific error message before the unique index catches it)
    IF NEW.gstin IS NOT NULL AND NEW.gstin != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.firms 
            WHERE UPPER(TRIM(gstin)) = NEW.gstin 
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'A firm with this GSTIN already exists' USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    -- Pre-validate exact PAN matches
    IF NEW.pan IS NOT NULL AND NEW.pan != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.firms 
            WHERE UPPER(TRIM(pan)) = NEW.pan 
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'A firm with this PAN number already exists' USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_normalize_firm_unique_fields ON public.firms;
CREATE TRIGGER trg_normalize_firm_unique_fields
    BEFORE INSERT OR UPDATE ON public.firms
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_firm_unique_fields();
