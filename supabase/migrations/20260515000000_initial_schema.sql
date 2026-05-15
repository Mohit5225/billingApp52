-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE public.user_role AS ENUM ('ca_admin', 'ca_employee', 'merchant');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Firms (Tenancy Boundary)
CREATE TABLE public.firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles (Links Auth to Firm and Role)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. RLS HELPER FUNCTIONS
-- ==========================================
-- These functions use SECURITY DEFINER to bypass RLS internally. 
-- This prevents infinite recursion when evaluating policies.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_firm_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM profiles WHERE id = auth.uid();
$$;

-- ==========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. RLS POLICIES: FIRMS
-- ==========================================
-- Select: CAs/Employees see their firm & child firms. Merchants see only their firm.
CREATE POLICY "firms_select" ON public.firms FOR SELECT TO authenticated
USING (
    id = get_user_firm_id() OR 
    (parent_firm_id = get_user_firm_id() AND get_user_role() IN ('ca_admin', 'ca_employee'))
);

-- Insert: Only ca_admin can create firms.
CREATE POLICY "firms_insert" ON public.firms FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'ca_admin' AND
    (id = get_user_firm_id() OR parent_firm_id = get_user_firm_id())
);

-- Update: ca_admin can update any firm in scope. Merchants can update their own firm.
CREATE POLICY "firms_update" ON public.firms FOR UPDATE TO authenticated
USING (
    id = get_user_firm_id() OR 
    (parent_firm_id = get_user_firm_id() AND get_user_role() = 'ca_admin')
)
WITH CHECK (
    id = get_user_firm_id() OR 
    (parent_firm_id = get_user_firm_id() AND get_user_role() = 'ca_admin')
);

-- Delete: Only ca_admin can delete firms.
CREATE POLICY "firms_delete" ON public.firms FOR DELETE TO authenticated
USING (
    get_user_role() = 'ca_admin' AND 
    (id = get_user_firm_id() OR parent_firm_id = get_user_firm_id())
);

-- ==========================================
-- 6. RLS POLICIES: PROFILES
-- ==========================================
-- Select: CAs/Employees see users in their scope. Merchants see users in their firm.
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (
    firm_id = get_user_firm_id() OR 
    (firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()) AND get_user_role() IN ('ca_admin', 'ca_employee'))
);

-- Insert: Only ca_admin can create/invite profiles
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'ca_admin' AND
    (firm_id = get_user_firm_id() OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()))
);

-- Update: Users can update themselves. ca_admin can update anyone in scope.
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (
    id = auth.uid() OR
    (get_user_role() = 'ca_admin' AND (firm_id = get_user_firm_id() OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id())))
)
WITH CHECK (
    id = auth.uid() OR
    (get_user_role() = 'ca_admin' AND (firm_id = get_user_firm_id() OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id())))
);

-- Delete: Only ca_admin can delete profiles
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
USING (
    get_user_role() = 'ca_admin' AND
    (firm_id = get_user_firm_id() OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()))
);

-- ==========================================
-- 7. RLS POLICIES: INVOICES
-- ==========================================
-- Select: CAs/Employees see all in scope. Merchants see their own firm's.
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
USING (
    firm_id = get_user_firm_id() OR 
    (firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()) AND get_user_role() IN ('ca_admin', 'ca_employee'))
);

-- Insert: All roles can insert, but only into firms they have access to.
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
    firm_id = get_user_firm_id() OR 
    (firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()) AND get_user_role() IN ('ca_admin', 'ca_employee'))
);

-- Update: All roles can update, but only in firms they have access to.
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated
USING (
    firm_id = get_user_firm_id() OR 
    (firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()) AND get_user_role() IN ('ca_admin', 'ca_employee'))
)
WITH CHECK (
    firm_id = get_user_firm_id() OR 
    (firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()) AND get_user_role() IN ('ca_admin', 'ca_employee'))
);

-- Delete: ca_admin and ca_employee can delete. Merchants CANNOT.
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
USING (
    get_user_role() IN ('ca_admin', 'ca_employee') AND
    (firm_id = get_user_firm_id() OR firm_id IN (SELECT id FROM public.firms WHERE parent_firm_id = get_user_firm_id()))
);
