-- Force master status for the current admin user
DO $$
DECLARE
    target_email TEXT := 'paulofernandoautomacao@gmail.com';
    target_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;
    
    IF target_id IS NOT NULL THEN
        -- 1. Update user_profiles (Essential for UI and most RLS)
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = target_id) THEN
            UPDATE public.user_profiles SET is_master = true WHERE id = target_id;
        ELSE
            INSERT INTO public.user_profiles (id, is_master)
            VALUES (target_id, true)
            ON CONFLICT (id) DO UPDATE SET is_master = true;
        END IF;

        -- 2. Update organization_members (Handles DB permissions)
        -- If 'master' role is blocked by a database constraint, we use 'admin' as fallback
        BEGIN
            UPDATE public.organization_members SET role = 'master' WHERE user_id = target_id;
        EXCEPTION WHEN OTHERS THEN
            UPDATE public.organization_members SET role = 'admin' WHERE user_id = target_id;
        END;
        
        -- 3. Ensure organization presence
        IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = target_id) THEN
            INSERT INTO public.organization_members (organization_id, user_id, role)
            SELECT id, target_id, 'admin' FROM public.organizations LIMIT 1;
        END IF;
    END IF;
END $$;
