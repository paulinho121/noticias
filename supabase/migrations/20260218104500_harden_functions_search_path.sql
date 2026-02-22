-- ========================================================
-- SECURITY HARDENING: FIX SEARCH PATH MUTABILITY
-- Resolves Supabase "Function Search Path Mutable" warnings
-- ========================================================

-- This migration sets a fixed search_path for all critical functions
-- to prevent search path hijacking, a common PostgreSQL security recommendation.

-- 1. Helper Functions
ALTER FUNCTION public.get_my_organization() SET search_path = public;
ALTER FUNCTION public.get_my_organization_strict() SET search_path = public;
ALTER FUNCTION public.is_master_admin() SET search_path = public;

-- 2. Security & Utility Functions
ALTER FUNCTION public.mask_credentials(jsonb) SET search_path = public;
ALTER FUNCTION public.is_user_blocked(uuid) SET search_path = public;
ALTER FUNCTION public.check_organization_quota(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_saas_metrics() SET search_path = public;

-- 3. Trigger Functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_masked_credentials() SET search_path = public;
ALTER FUNCTION public.sanitize_log_message() SET search_path = public;
ALTER FUNCTION public.auto_create_org_on_signup() SET search_path = public;
ALTER FUNCTION public.ensure_user_organization() SET search_path = public;
ALTER FUNCTION public.clean_policies(text) SET search_path = public;

-- 4. Try to fix has_active_access if it exists (guessing common signatures)
DO $$ 
BEGIN
    -- Check for has_active_access() with no params
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'has_active_access' AND pg_namespace.nspname = 'public') THEN
        BEGIN
            ALTER FUNCTION public.has_active_access() SET search_path = public;
        EXCEPTION WHEN OTHERS THEN 
            BEGIN
                ALTER FUNCTION public.has_active_access(uuid) SET search_path = public;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not fix has_active_access automatically';
            END;
        END;
    END IF;
END $$;

-- 5. Global hardening for all public functions (Optional but recommended)
-- This loop will try to set search_path = public for every function in the public schema
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            p.oid::regprocedure as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_record.func_signature);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not set search_path for function %: %', func_record.func_signature, SQLERRM;
        END;
    END LOOP;
END $$;

COMMENT ON DATABASE postgres IS 'Security hardened: search_path fixed for public functions.';
