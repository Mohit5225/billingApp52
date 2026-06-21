-- 09_period_block.sql

CREATE TABLE IF NOT EXISTS period_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    block_sales BOOLEAN NOT NULL DEFAULT false,
    block_purchases BOOLEAN NOT NULL DEFAULT false,
    block_credit_notes BOOLEAN NOT NULL DEFAULT false,
    block_debit_notes BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT period_blocks_firm_year_month_key UNIQUE (firm_id, year, month)
);

-- Enable Row Level Security
ALTER TABLE period_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for period_blocks
-- 1. Read access
CREATE POLICY "Users can view period blocks for their firm"
    ON period_blocks FOR SELECT
    USING (
        firm_id IN (
            SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 2. Insert access (Any user in the firm can insert a period block row initially)
CREATE POLICY "Users can create period blocks for their firm"
    ON period_blocks FOR INSERT
    WITH CHECK (
        firm_id IN (
            SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 3. Update access (Any user in the firm can update, but the backend API will restrict Merchants from setting true -> false)
CREATE POLICY "Users can update period blocks for their firm"
    ON period_blocks FOR UPDATE
    USING (
        firm_id IN (
            SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        firm_id IN (
            SELECT firm_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION handle_period_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_period_blocks_updated_at
    BEFORE UPDATE ON period_blocks
    FOR EACH ROW
    EXECUTE FUNCTION handle_period_blocks_updated_at();
