-- ========================================================
-- NUCLEAR SECURITY LOCKDOWN: FIX SYSTEM-WIDE LEAK (V14 - MAXIMUM NUCLEAR DELETE)
-- Resolves: Foreign key constraint on "feeds" blocking deletion
-- ========================================================

-- 1. Redefine is_master_admin (Strictly Hardcoded Whitelist)
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
  v_is_master_flag BOOLEAN := false;
BEGIN
  v_email := (auth.jwt() ->> 'email');
  
  IF v_email IN (
    'paulofernandoautomacao@gmail.com',
    'jotavmkt@gmail.com',
    'labwpplus@gmail.com',
    'labnews.pro@gmail.com',
    'admin@labnews.pro'
  ) THEN
    SELECT is_master INTO v_is_master_flag FROM public.user_profiles WHERE id = auth.uid();
    RETURN COALESCE(v_is_master_flag, false);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. RESET & LOCKDOWN TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_master_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_master = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = NEW.id 
      AND email IN (
        'paulofernandoautomacao@gmail.com',
        'jotavmkt@gmail.com',
        'labwpplus@gmail.com',
        'labnews.pro@gmail.com',
        'admin@labnews.pro'
      )
    ) THEN
      NEW.is_master := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_master_status ON public.user_profiles;
CREATE TRIGGER trg_lock_master_status
BEFORE INSERT OR UPDATE OF is_master ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_master_promotion();

-- 3. MAXIMUM NUCLEAR USER DELETION FUNCTION (V14)
-- This version handles "feeds", "schedules", and "feed_items" dependencies
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- SECURITY CHECK
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores master podem excluir contas.';
    END IF;

    -- CLEANUP SEQUENCE (Order optimized for Foreign Keys)
    
    -- 1. Logs (references almost everything)
    DELETE FROM public.logs WHERE user_id = target_user_id;

    -- 2. Feed-related data (if user_id exists in feeds)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'feeds' AND column_name = 'user_id' AND table_schema = 'public') THEN
        -- Delete items first
        DELETE FROM public.feed_items WHERE feed_id IN (SELECT id FROM public.feeds WHERE user_id = target_user_id);
        -- Delete schedules
        DELETE FROM public.schedules WHERE feed_id IN (SELECT id FROM public.feeds WHERE user_id = target_user_id);
        -- Delete feeds
        DELETE FROM public.feeds WHERE user_id = target_user_id;
    END IF;

    -- 3. Audit & Notifications
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'audit_logs' AND column_name = 'user_id' AND table_schema = 'public') THEN
        EXECUTE format('DELETE FROM public.audit_logs WHERE user_id = %L', target_user_id);
    END IF;
    DELETE FROM public.user_notifications WHERE user_id = target_user_id;
    
    -- 4. Settings & Connections
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'platform_settings' AND column_name = 'user_id' AND table_schema = 'public') THEN
        DELETE FROM public.platform_settings WHERE user_id = target_user_id;
    END IF;
    
    -- 5. Support System
    DELETE FROM public.ticket_comments WHERE user_id = target_user_id;
    DELETE FROM public.support_tickets WHERE user_id = target_user_id;
    
    -- 6. Membership & Profile
    DELETE FROM public.organization_members WHERE user_id = target_user_id;
    DELETE FROM public.user_profiles WHERE id = target_user_id;

    -- 7. THE FINAL BLOW: Auth deletion
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro crítico ao excluir conta: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 4. RE-LOCK RLS (Final hardening)
DO $$
DECLARE
    target_table_name TEXT;
    table_list TEXT[] := ARRAY[
        'feeds', 'feed_items', 'schedules', 'logs', 'categories', 
        'platform_settings', 'white_label_settings', 'organization_members',
        'user_notifications', 'support_tickets', 'ticket_comments',
        'organizations', 'user_profiles'
    ];
    policy_clause TEXT;
BEGIN
    FOREACH target_table_name IN ARRAY table_list LOOP
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_name = target_table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table_name);
            EXECUTE format('
                DO $inner$
                DECLARE
                    pol record;
                BEGIN
                    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public'' LOOP
                        EXECUTE format(''DROP POLICY IF EXISTS %%I ON public.%%I'', pol.policyname, %L);
                    END LOOP;
                END;
                $inner$;', target_table_name, target_table_name);

            policy_clause := 'public.is_master_admin()';
            IF target_table_name = 'organizations' THEN
                policy_clause := policy_clause || ' OR (id = public.get_my_organization_strict())';
            ELSIF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = target_table_name AND column_name = 'organization_id' AND table_schema = 'public') THEN
                policy_clause := policy_clause || ' OR (organization_id = public.get_my_organization_strict())';
            END IF;
            IF target_table_name = 'user_profiles' THEN
                policy_clause := policy_clause || ' OR (id = auth.uid())';
            ELSIF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = target_table_name AND column_name = 'user_id' AND table_schema = 'public') THEN
                policy_clause := policy_clause || ' OR (user_id = auth.uid())';
            END IF;
            EXECUTE format('CREATE POLICY "Nuclear_Isolation_%s" ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', target_table_name, target_table_name, policy_clause, policy_clause);
        END IF;
    END LOOP;
END $$;
