-- ========================================================
-- NUCLEAR FIX: DATA LEAKAGE BETWEEN ACCOUNTS
-- Resolves: New users seeing data with NULL organization_id
-- ========================================================

-- 1. Ensure all users have an organization (Auto-create if missing)
CREATE OR REPLACE FUNCTION public.ensure_user_organization()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Only for new users or if they don't have an org member entry
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
        -- Create a new private organization for this user
        INSERT INTO public.organizations (name, slug)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Organização'),
            'org-' || substr(NEW.id::text, 1, 8) || '-' || TO_CHAR(NOW(), 'DDMMYYHH24MISS')
        )
        RETURNING id INTO new_org_id;

        -- Add user as owner
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'owner');

        -- Create initial settings
        INSERT INTO public.white_label_settings (organization_id, app_name)
        VALUES (new_org_id, 'LabNews');
        
        -- Create a default profile
        INSERT INTO public.user_profiles (id, full_name, role)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'), 'user')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (requires manual setup usually in Supabase UI or superuser)
-- But we can simulate it for existing users who might be in "limbo"
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, raw_user_meta_data FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = u.id) THEN
            -- Apply the same logic as the trigger
            DECLARE
                new_org_id UUID;
            BEGIN
                INSERT INTO public.organizations (name, slug)
                VALUES (
                    COALESCE(u.raw_user_meta_data->>'full_name', 'Minha Organização'),
                    'org-' || substr(u.id::text, 1, 8) || '-' || TO_CHAR(NOW(), 'DDMMYYHH24MISS')
                )
                RETURNING id INTO new_org_id;

                INSERT INTO public.organization_members (organization_id, user_id, role)
                VALUES (new_org_id, u.id, 'owner');

                INSERT INTO public.white_label_settings (organization_id, app_name)
                VALUES (new_org_id, 'LabNews');
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not create org for user %: %', u.id, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- 2. STRENGTHEN RLS POLICIES (No more IS NOT DISTINCT FROM NULL leak)
-- We switch to standard = which is NULL-unsafe (good for isolation)

-- Helper to get org ID, ensuring it NEVER returns NULL if user is authenticated (it should return something)
-- If it returns NULL, the query should fail/return nothing.
CREATE OR REPLACE FUNCTION public.get_my_organization_strict()
RETURNS UUID AS $$
    -- Returns organization_id ONLY if it exists, otherwise returns a dummy UUID that won't match anything
    SELECT COALESCE(
        (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::uuid
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Re-apply policies to all critical tables
-- Feeds
DROP POLICY IF EXISTS "Isolamento: feeds" ON public.feeds;
CREATE POLICY "Isolamento: feeds" ON public.feeds FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- Feed Items
DROP POLICY IF EXISTS "Isolamento: feed_items" ON public.feed_items;
CREATE POLICY "Isolamento: feed_items" ON public.feed_items FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- Schedules
DROP POLICY IF EXISTS "Isolamento: schedules" ON public.schedules;
CREATE POLICY "Isolamento: schedules" ON public.schedules FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- Logs
DROP POLICY IF EXISTS "Isolamento: logs" ON public.logs;
CREATE POLICY "Isolamento: logs" ON public.logs FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- Categories (Allow global ones with organization_id NULL, but ONLY if we specifically want them public)
-- Actually, let's keep it strict for now.
DROP POLICY IF EXISTS "Isolamento: categories" ON public.categories;
CREATE POLICY "Isolamento: categories" ON public.categories FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR (organization_id IS NULL AND public.is_master_admin()) -- Only master sees truly "global" null orgs
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- Platform Settings
DROP POLICY IF EXISTS "Isolamento: platform_settings" ON public.platform_settings;
CREATE POLICY "Isolamento: platform_settings" ON public.platform_settings FOR ALL TO authenticated 
USING (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
)
WITH CHECK (
  (organization_id = public.get_my_organization_strict()) 
  OR public.is_master_admin()
);

-- 3. CLEANUP: Assign any remaining NULL organization_id to a "System" or "Orphan" org if needed
-- For now, we leave them as they will be hidden by the strict RLS above.
