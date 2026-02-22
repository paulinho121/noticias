-- ========================================================
-- SECURITY HARDENING: DATA ISOLATION & SECRET MASKING
-- ========================================================

-- 1. FIX STORAGE POLICIES (ORGANIZATION ISOLATION)
-- Brand Assets
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete assets" ON storage.objects;

-- Allow public read but only if we want to. Actually, let's keep it public but strictly isolation for mutations.
CREATE POLICY "Brand Assets: Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'brand_assets');

CREATE POLICY "Brand Assets: Org Insertion" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'brand_assets' 
  AND (storage.foldername(name))[1] = (public.get_my_organization())::text
);

CREATE POLICY "Brand Assets: Org Deletion" ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'brand_assets' 
  AND (storage.foldername(name))[1] = (public.get_my_organization())::text
);

-- News Images (Isolation)
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "News Images: Public Read" ON storage.objects;
CREATE POLICY "News Images: Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');

CREATE POLICY "News Images: Org Insertion" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'news-images' 
  AND (
    public.is_master_admin() -- Allow system/master upload
    OR (storage.foldername(name))[1] = (public.get_my_organization())::text
  )
);

-- 2. SECRET MASKING FOR API KEYS (PLATFORM SETTINGS)
-- We want users to see THAT they have a key, but not WHAT it is.

CREATE OR REPLACE FUNCTION public.mask_credentials(creds JSONB) 
RETURNS JSONB AS $$
DECLARE
    key_val TEXT;
    masked_val TEXT;
BEGIN
    IF creds ? 'api_key' THEN
        key_val := creds->>'api_key';
        IF length(key_val) > 8 THEN
            masked_val := '****' || right(key_val, 4);
        ELSE
            masked_val := '****';
        END IF;
        RETURN creds || jsonb_build_object('api_key', masked_val, 'is_masked', true);
    END IF;
    RETURN creds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the platform_settings RLS to use the masker for non-service-role
-- Since RLS doesn't easily modify columns on SELECT, we will create a SECURE VIEW

DROP VIEW IF EXISTS public.platform_settings_secure;
CREATE VIEW public.platform_settings_secure AS
SELECT 
    id,
    platform_id,
    user_id,
    organization_id,
    is_connected,
    is_auto_publish,
    updated_at,
    CASE 
        WHEN public.is_master_admin() THEN credentials -- Master sees all for debugging/management (optional, can be stricter)
        ELSE public.mask_credentials(credentials) 
    END as credentials
FROM public.platform_settings;

-- Grant access to the view
GRANT SELECT ON public.platform_settings_secure TO authenticated;

-- 3. SANITIZATION TRIGGER FOR LOGS
-- Prevents sensitive info from accidentally leaking into logs messages

CREATE OR REPLACE FUNCTION public.sanitize_log_message() 
RETURNS TRIGGER AS $$
BEGIN
    -- Remove common API key patterns from message
    NEW.message := regexp_replace(NEW.message, 'sk-[a-zA-Z0-9]{20,}', 'sk-****', 'g');
    NEW.message := regexp_replace(NEW.message, 'AIza[a-zA-Z0-9_-]{20,}', 'AIza****', 'g');
    NEW.message := regexp_replace(NEW.message, 'gsk_[a-zA-Z0-9]{20,}', 'gsk_****', 'g');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sanitize_logs ON public.logs;
CREATE TRIGGER trg_sanitize_logs
BEFORE INSERT ON public.logs
FOR EACH ROW EXECUTE FUNCTION public.sanitize_log_message();

-- 4. WP URL VALIDATION (DATABASE LEVEL)
ALTER TABLE public.platform_settings ADD CONSTRAINT cw_valid_wp_url 
CHECK (
    platform_id != 'wordpress' 
    OR credentials->>'url' ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
);
