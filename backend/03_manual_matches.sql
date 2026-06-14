CREATE TABLE IF NOT EXISTS manual_matches (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  match_type     TEXT NOT NULL CHECK (match_type IN ('purchases', 'debit_notes')),
  gstin          TEXT NOT NULL,          -- normalized GSTIN (already uppercase, no spaces from backend)
  invoice_number TEXT NOT NULL,          -- NORMALIZED key (normalize_key_str output — no slashes, uppercase)
  source_tab     TEXT NOT NULL CHECK (source_tab IN ('partial', 'not_at_site', 'not_in_software')),
  deviations     TEXT,                   -- JSON array string of deviation fields at time of marking
  marked_by      UUID REFERENCES auth.users(id),  -- audit: which user approved it
  note           TEXT,                   -- optional free-text note from user
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (firm_id, match_type, gstin, invoice_number)
);

ALTER TABLE manual_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_matches_firm_access" ON manual_matches
  FOR ALL USING ( can_access_firm(firm_id) );
