-- Part 1: Pre-migration Data Cleanup

-- For names: append _DUP<id> for duplicates
WITH duplicate_names AS (
    SELECT id, name, firm_id,
           ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)), firm_id ORDER BY created_at) as rn
    FROM public.ledgers
)
UPDATE public.ledgers
SET name = name || '_DUP' || (duplicate_names.rn - 1)
FROM duplicate_names
WHERE public.ledgers.id = duplicate_names.id
  AND duplicate_names.rn > 1;

-- For GSTIN: set NULL for duplicates
WITH duplicate_gstins AS (
    SELECT p.ledger_id, p.gstin, l.firm_id,
           ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(p.gstin)), l.firm_id ORDER BY l.created_at) as rn
    FROM public.ledger_party_details p
    JOIN public.ledgers l ON p.ledger_id = l.id
    WHERE p.gstin IS NOT NULL AND TRIM(p.gstin) <> ''
)
UPDATE public.ledger_party_details
SET gstin = NULL
FROM duplicate_gstins
WHERE public.ledger_party_details.ledger_id = duplicate_gstins.ledger_id
  AND duplicate_gstins.rn > 1;

-- For PAN: set NULL for duplicates
WITH duplicate_pans AS (
    SELECT p.ledger_id, p.pan_number, l.firm_id,
           ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(p.pan_number)), l.firm_id ORDER BY l.created_at) as rn
    FROM public.ledger_party_details p
    JOIN public.ledgers l ON p.ledger_id = l.id
    WHERE p.pan_number IS NOT NULL AND TRIM(p.pan_number) <> ''
)
UPDATE public.ledger_party_details
SET pan_number = NULL
FROM duplicate_pans
WHERE public.ledger_party_details.ledger_id = duplicate_pans.ledger_id
  AND duplicate_pans.rn > 1;


-- Part 2: Case-Insensitive Ledger Name Uniqueness (`ledgers` table)
ALTER TABLE public.ledgers DROP CONSTRAINT IF EXISTS uq_ledger_name_per_firm;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_name_trim_lower_firm ON public.ledgers (LOWER(TRIM(name)), firm_id);


-- Part 3: GSTIN & PAN Uniqueness and Normalization (`ledger_party_details` table)
CREATE OR REPLACE FUNCTION check_party_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
    v_duplicate_id UUID;
BEGIN
    -- Normalize the incoming data
    IF NEW.gstin IS NOT NULL THEN
        NEW.gstin := UPPER(TRIM(NEW.gstin));
        IF NEW.gstin = '' THEN
            NEW.gstin := NULL;
        END IF;
    END IF;

    IF NEW.pan_number IS NOT NULL THEN
        NEW.pan_number := UPPER(TRIM(NEW.pan_number));
        IF NEW.pan_number = '' THEN
            NEW.pan_number := NULL;
        END IF;
    END IF;

    -- Get the firm_id of the ledger being inserted/updated
    SELECT firm_id INTO v_firm_id FROM public.ledgers WHERE id = NEW.ledger_id;

    -- Check for duplicate GSTIN
    IF NEW.gstin IS NOT NULL THEN
        SELECT l.id INTO v_duplicate_id
        FROM public.ledger_party_details p
        JOIN public.ledgers l ON p.ledger_id = l.id
        WHERE l.firm_id = v_firm_id
          AND p.gstin = NEW.gstin
          AND p.ledger_id <> NEW.ledger_id
        LIMIT 1;
        
        IF FOUND THEN
            RAISE EXCEPTION 'A party with this GSTIN already exists for this firm.' USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    -- Check for duplicate PAN
    IF NEW.pan_number IS NOT NULL THEN
        SELECT l.id INTO v_duplicate_id
        FROM public.ledger_party_details p
        JOIN public.ledgers l ON p.ledger_id = l.id
        WHERE l.firm_id = v_firm_id
          AND p.pan_number = NEW.pan_number
          AND p.ledger_id <> NEW.ledger_id
        LIMIT 1;
        
        IF FOUND THEN
            RAISE EXCEPTION 'A party with this PAN number already exists for this firm.' USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_party_uniqueness ON public.ledger_party_details;
CREATE TRIGGER trg_check_party_uniqueness
BEFORE INSERT OR UPDATE ON public.ledger_party_details
FOR EACH ROW EXECUTE FUNCTION check_party_uniqueness();
