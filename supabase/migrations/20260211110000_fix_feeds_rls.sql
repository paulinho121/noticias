-- ========================================================
-- FIX: Row Level Security for Feeds and Business Tables
-- Resolves: "new row violates row-level security policy"
-- ========================================================

-- 1. Improve get_my_organization to be more robust
CREATE OR REPLACE FUNCTION public.get_my_organization()
RETURNS UUID AS $$
  -- Returns the first organization found for the user
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Improve is_master_admin to check both user_profiles and organization_members
-- Added check for profiles table too as some migrations might use it
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_master_prof BOOLEAN := false;
  is_master_user_prof BOOLEAN := false;
  is_master_member BOOLEAN := false;
BEGIN
  -- Check user_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_master = true) INTO is_master_user_prof;
  END IF;

  -- Check profiles (possible alternative name)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)' INTO is_master_prof;
  END IF;

  -- Check organization_members
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = 'master') INTO is_master_member;

  RETURN is_master_prof OR is_master_user_prof OR is_master_member;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Update RLS policies to handle NULL organization_id correctly
-- Use IS NOT DISTINCT FROM to allow NULL = NULL comparison

-- Feeds
DROP POLICY IF EXISTS "Isolamento: feeds" ON public.feeds;
CREATE POLICY "Isolamento: feeds" ON public.feeds FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);

-- Schedules
DROP POLICY IF EXISTS "Isolamento: schedules" ON public.schedules;
CREATE POLICY "Isolamento: schedules" ON public.schedules FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);

-- Feed Items
DROP POLICY IF EXISTS "Isolamento: feed_items" ON public.feed_items;
CREATE POLICY "Isolamento: feed_items" ON public.feed_items FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);

-- Logs
DROP POLICY IF EXISTS "Isolamento: logs" ON public.logs;
CREATE POLICY "Isolamento: logs" ON public.logs FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);

-- Platform Settings
DROP POLICY IF EXISTS "Isolamento: platform_settings" ON public.platform_settings;
CREATE POLICY "Isolamento: platform_settings" ON public.platform_settings FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);

-- Categories
DROP POLICY IF EXISTS "Isolamento: categories" ON public.categories;
CREATE POLICY "Isolamento: categories" ON public.categories FOR ALL TO authenticated 
USING (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR organization_id IS NULL 
  OR public.is_master_admin()
)
WITH CHECK (
  organization_id IS NOT DISTINCT FROM public.get_my_organization() 
  OR public.is_master_admin()
);
