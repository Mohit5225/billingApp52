-- ==========================================
-- 1. CREATE TYPE FOR GROUP NATURE
-- ==========================================
CREATE TYPE public.account_nature AS ENUM ('Asset', 'Liability', 'Income', 'Expense');

-- ==========================================
-- 2. CREATE TABLE
-- ==========================================
CREATE TABLE public.account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alias TEXT,
    nature public.account_nature NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT false,
    parent_id UUID REFERENCES public.account_groups(id) ON DELETE RESTRICT,

    affects_gross_profit BOOLEAN NOT NULL DEFAULT false,
    is_control_account BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 999, -- FIXED: Default to 999 so custom groups go to the bottom
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- FIXED: Added updated_at

    CONSTRAINT uq_system_group_name UNIQUE NULLS NOT DISTINCT (name, firm_id),
    CONSTRAINT chk_group_hierarchy CHECK (
        (is_primary = true AND parent_id IS NULL) OR
        (is_primary = false AND parent_id IS NOT NULL)
    ),
    CONSTRAINT chk_system_firm CHECK (
        (is_system = true AND firm_id IS NULL) OR
        (is_system = false AND firm_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_account_groups_parent ON public.account_groups(parent_id);
CREATE INDEX idx_account_groups_firm ON public.account_groups(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX idx_account_groups_alias ON public.account_groups(alias) WHERE alias IS NOT NULL;
CREATE INDEX idx_account_groups_is_system ON public.account_groups(is_system); -- FIXED: Speed boost index


-- ==========================================
-- 3. TRIGGERS (Auto-Update Time & System Protection)
-- ==========================================
-- FIXED: Auto-updates the 'updated_at' clock on every edit
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_account_groups_updated_at
BEFORE UPDATE ON public.account_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FIXED: Hacker-proof escape hatch (case-insensitive + admin only check)
CREATE OR REPLACE FUNCTION prevent_system_group_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF LOWER(COALESCE(current_setting('app.allow_system_mutation', true), '')) = 'true' 
       AND current_user = 'postgres' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF OLD.is_system = true THEN
        RAISE EXCEPTION 'Cannot modify or delete global system group: %', OLD.name;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_system_groups
BEFORE UPDATE OR DELETE ON public.account_groups
FOR EACH ROW EXECUTE FUNCTION prevent_system_group_mutation();


-- ==========================================
-- 4. ENABLE RLS AND POLICIES
-- ==========================================
ALTER TABLE public.account_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_groups_select" ON public.account_groups
FOR SELECT TO authenticated
USING (
    is_system = true
    OR firm_id = (SELECT get_user_firm_id())
    OR (
        (SELECT get_user_role()) IN ('ca_admin', 'ca_employee')
        AND firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- FIXED: Added `AND is_primary = false` to prevent custom Root groups
CREATE POLICY "account_groups_insert" ON public.account_groups
FOR INSERT TO authenticated
WITH CHECK (
    is_system = false
    AND is_primary = false 
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

-- FIXED: Added `AND is_primary = false`
CREATE POLICY "account_groups_update" ON public.account_groups
FOR UPDATE TO authenticated
USING (
    is_system = false
    AND is_primary = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
)
WITH CHECK (
    is_system = false
    AND is_primary = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);

CREATE POLICY "account_groups_delete" ON public.account_groups
FOR DELETE TO authenticated
USING (
    is_system = false
    AND (SELECT get_user_role()) = 'ca_admin'
    AND (
        firm_id = (SELECT get_user_firm_id())
        OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = (SELECT get_user_firm_id()))
    )
);


-- ==========================================
-- 5. SEED DATA (Exactly as before, no changes needed)
-- ==========================================
BEGIN;
INSERT INTO public.account_groups (name, alias, nature, affects_gross_profit, is_control_account, is_system, is_primary, sort_order, parent_id, firm_id)
VALUES
    ('Capital Account',         NULL,               'Liability', false, false, true, true, 10,  NULL, NULL),
    ('Loans (Liability)',       'Loans',            'Liability', false, false, true, true, 20,  NULL, NULL),
    ('Current Liabilities',     NULL,               'Liability', false, false, true, true, 30,  NULL, NULL),
    ('Suspense A/c',            'Suspense',         'Liability', false, false, true, true, 40,  NULL, NULL),
    ('Fixed Assets',            NULL,               'Asset',     false, false, true, true, 50,  NULL, NULL),
    ('Investments',             NULL,               'Asset',     false, false, true, true, 60,  NULL, NULL),
    ('Current Assets',          NULL,               'Asset',     false, false, true, true, 70,  NULL, NULL),
    ('Misc. Expenses (ASSET)',  'Misc. Expenses',   'Asset',     false, false, true, true, 80,  NULL, NULL),
    ('Branch / Divisions',      'Branches',         'Liability', false, false, true, true, 90,  NULL, NULL),
    ('Sales Accounts',          'Sales',            'Income',    true,  false, true, true, 100, NULL, NULL),
    ('Direct Incomes',          'Direct Income',    'Income',    true,  false, true, true, 110, NULL, NULL),
    ('Indirect Incomes',        'Indirect Income',  'Income',    false, false, true, true, 120, NULL, NULL),
    ('Purchase Accounts',       'Purchase',         'Expense',   true,  false, true, true, 130, NULL, NULL),
    ('Direct Expenses',         'Direct Expense',   'Expense',   true,  false, true, true, 140, NULL, NULL),
    ('Indirect Expenses',       'Indirect Expense', 'Expense',   false, false, true, true, 150, NULL, NULL);

INSERT INTO public.account_groups (name, alias, nature, affects_gross_profit, is_control_account, is_system, is_primary, sort_order, parent_id, firm_id)
VALUES
    ('Reserves & Surplus',        'Reserves',     'Liability', false, false, true, false, 10, (SELECT id FROM public.account_groups WHERE name = 'Capital Account' AND firm_id IS NULL), NULL),
    ('Bank OD A/c',               'Bank OCC A/c', 'Liability', false, false, true, false, 10, (SELECT id FROM public.account_groups WHERE name = 'Loans (Liability)' AND firm_id IS NULL), NULL),
    ('Secured Loans',             NULL,           'Liability', false, false, true, false, 20, (SELECT id FROM public.account_groups WHERE name = 'Loans (Liability)' AND firm_id IS NULL), NULL),
    ('Unsecured Loans',           NULL,           'Liability', false, false, true, false, 30, (SELECT id FROM public.account_groups WHERE name = 'Loans (Liability)' AND firm_id IS NULL), NULL),
    ('Duties & Taxes',            'Taxes',        'Liability', false, false, true, false, 10, (SELECT id FROM public.account_groups WHERE name = 'Current Liabilities' AND firm_id IS NULL), NULL),
    ('Provisions',                NULL,           'Liability', false, false, true, false, 20, (SELECT id FROM public.account_groups WHERE name = 'Current Liabilities' AND firm_id IS NULL), NULL),
    ('Sundry Creditors',          'Creditors',    'Liability', false, true,  true, false, 30, (SELECT id FROM public.account_groups WHERE name = 'Current Liabilities' AND firm_id IS NULL), NULL),
    ('Stock-in-Hand',             'Stock',        'Asset',     false, false, true, false, 10, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL),
    ('Deposits (Asset)',          'Deposits',     'Asset',     false, false, true, false, 20, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL),
    ('Loans & Advances (Asset)',  'Advances',     'Asset',     false, false, true, false, 30, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL),
    ('Sundry Debtors',            'Debtors',      'Asset',     false, true,  true, false, 40, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL),
    ('Cash-in-Hand',              'Cash',         'Asset',     false, false, true, false, 50, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL),
    ('Bank Accounts',             'Bank',         'Asset',     false, false, true, false, 60, (SELECT id FROM public.account_groups WHERE name = 'Current Assets' AND firm_id IS NULL), NULL);
COMMIT;