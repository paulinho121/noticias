-- ========================================================
-- SECURITY FIX: SECURITY DEFINER TO SECURITY INVOKER
-- Resolves Supabase "Security Definer View" warning
-- ========================================================

-- Re-create the platform_settings_secure view with security_invoker = true
-- This ensures that Row Level Security (RLS) on the underlying table 
-- is respected based on the user querying the view.

DROP VIEW IF EXISTS public.platform_settings_secure;

CREATE VIEW public.platform_settings_secure 
WITH (security_invoker = true)
AS
SELECT 
    id,
    platform_id,
    user_id,
    organization_id,
    is_connected,
    is_auto_publish,
    updated_at,
    CASE 
        WHEN public.is_master_admin() THEN credentials 
        ELSE public.mask_credentials(credentials) 
    END as credentials
FROM public.platform_settings;

-- Grant access to the view again
GRANT SELECT ON public.platform_settings_secure TO authenticated;

-- Hardening the get_saas_metrics function
CREATE OR REPLACE FUNCTION public.get_saas_metrics()
RETURNS JSONB AS $$
DECLARE
    total_users INT;
    active_users INT;
    open_tickets INT;
    total_feeds INT;
    result JSONB;
BEGIN
    -- SECURITY CHECK: Only master admins can see platform-wide metrics
    IF NOT (SELECT public.is_master_admin()) THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores master podem acessar estas métricas.';
    END IF;

    SELECT count(*) INTO total_users FROM public.user_profiles;
    SELECT count(*) INTO active_users FROM public.user_profiles WHERE last_seen_at > now() - interval '15 minutes';
    SELECT count(*) INTO open_tickets FROM public.support_tickets WHERE status = 'open';
    SELECT count(*) INTO total_feeds FROM public.feeds;
    
    result := jsonb_build_object(
        'total_users', total_users,
        'active_now', active_users,
        'open_tickets', open_tickets,
        'total_feeds', total_feeds
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for clarity
COMMENT ON VIEW public.platform_settings_secure IS 'Secure view for platform settings that masks API keys and enforces RLS via security_invoker.';
