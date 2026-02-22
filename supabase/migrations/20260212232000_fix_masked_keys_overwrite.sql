-- ========================================================
-- FIX: PREVENT MASKED KEYS FROM OVERWRITING REAL KEYS
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_masked_credentials()
RETURNS TRIGGER AS $$
DECLARE
    new_creds JSONB := NEW.credentials;
    old_creds JSONB;
    key_val TEXT;
    field_name TEXT;
BEGIN
    -- Iterate through all fields in NEW credentials
    FOR field_name IN SELECT jsonb_object_keys(new_creds) LOOP
        key_val := new_creds->>field_name;
        
        -- If value starts with ****, it's a masked value from the UI
        IF key_val LIKE '****%' THEN
            -- Only replace if we have an existing record (UPDATE)
            IF (TG_OP = 'UPDATE') THEN
                old_creds := OLD.credentials;
                -- If the field existed in OLD creds, use the OLD value
                IF old_creds ? field_name THEN
                    new_creds := new_creds || jsonb_build_object(field_name, old_creds->>field_name);
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    NEW.credentials := new_creds;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_masked_credentials ON public.platform_settings;
CREATE TRIGGER trg_handle_masked_credentials
BEFORE INSERT OR UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_masked_credentials();

-- Also ensure RLS is correctly allowing upserts with the IS NOT DISTINCT FROM pattern
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
