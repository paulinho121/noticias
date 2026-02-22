-- ========================================================
-- NUCLEAR SECURITY HARDENING: FINAL ISOLATION & AUDIT
-- ========================================================

-- 1. DROP ALL POTENTIALLY PERMISSIVE POLICIES
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public read access for %s" ON public.%s', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Public insert access for %s" ON public.%s', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Public update access for %s" ON public.%s', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Public delete access for %s" ON public.%s', t, t);
    END LOOP;
END $$;

-- 2. STRENGTHEN THE ISOLATION HELPER
-- This function is the single source of truth for organization access.
CREATE OR REPLACE FUNCTION public.get_my_organization_strict()
RETURNS UUID AS $$
    -- Returns organization_id ONLY if it exists, otherwise returns a dummy UUID
    SELECT COALESCE(
        (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1),
        '00000000-0000-0000-0000-000000000001'::uuid -- Non-nullable dummy
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. APPLY STRICT RLS TO ALL TABLES
-- Feeds, Items, Schedules, Logs, Categories, Platform Settings

DO $$
DECLARE
    table_name TEXT;
    table_list TEXT[] := ARRAY['feeds', 'feed_items', 'schedules', 'logs', 'categories', 'platform_settings', 'white_label_settings'];
BEGIN
    FOREACH table_name IN ARRAY table_list LOOP
        -- Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        
        -- Drop old isolation policies if named differently
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento Estrito" ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Isolamento: %s" ON public.%I', table_name, table_name);

        -- Create Nuclear Isolation Policy
        EXECUTE format('
            CREATE POLICY "Nuclear_Isolation_%s" ON public.%I
            FOR ALL TO authenticated
            USING (
                (organization_id = public.get_my_organization_strict())
                OR public.is_master_admin()
            )
            WITH CHECK (
                (organization_id = public.get_my_organization_strict())
                OR public.is_master_admin()
            )', table_name, table_name);
    END LOOP;
END $$;

-- 4. ADDITIONAL PROTECTION: AUDIT LOGS INTEGRITY
-- Logs should be INSERT-only for regular users. Only Master Admin can DELETE or UPDATE.
DROP POLICY IF EXISTS "Nuclear_Isolation_logs" ON public.logs;

CREATE POLICY "Logs: Master Control" ON public.logs
    FOR ALL TO authenticated
    USING (public.is_master_admin());

CREATE POLICY "Logs: Member Insert/View" ON public.logs
    FOR SELECT TO authenticated
    USING (organization_id = public.get_my_organization_strict());

CREATE POLICY "Logs: Member Insert" ON public.logs
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.get_my_organization_strict());

-- 5. SANITIZATION: ENSURE WEB-BASED ACCESS TO SENSITIVE TABLES IS MINIMAL
-- We already have platform_settings_secure view. Let's make the table itself even harder to reach directly.
-- (Regular RLS covers it, but we can revoke direct SELECT if we want. For now RLS is enough).

-- 6. AUTOMATIC ORGANIZATION SETUP FOR NEW USERS
CREATE OR REPLACE FUNCTION public.auto_create_org_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_name TEXT;
BEGIN
    -- Extract company name from metadata or fallback
    org_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');

    -- Only create iforg member entry doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
        -- Create the organization
        INSERT INTO public.organizations (name, slug) 
        VALUES (
            org_name, 
            'org-' || lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 4)
        )
        RETURNING id INTO new_org_id;

        -- Link user as owner
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'owner');

        -- Create initial white label settings
        INSERT INTO public.white_label_settings (organization_id, app_name) 
        VALUES (new_org_id, 'LabNews');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: This trigger MUST be applied to auth.users in the Supabase Dashboard
-- or via a superuser SQL execution:
--
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.auto_create_org_on_signup();

