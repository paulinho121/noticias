-- Elevate jotavmkt@gmail.com to Founder and Super User status
DO $$
DECLARE
    target_email TEXT := 'jotavmkt@gmail.com';
    target_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;
    
    IF target_id IS NOT NULL THEN
        -- 1. Update user_profiles (Essential for UI and most RLS)
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = target_id) THEN
            UPDATE public.user_profiles 
            SET is_master = true, 
                full_name = COALESCE(full_name, 'Founder/Super User')
            WHERE id = target_id;
        ELSE
            INSERT INTO public.user_profiles (id, is_master, full_name)
            VALUES (target_id, true, 'Founder/Super User')
            ON CONFLICT (id) DO UPDATE SET is_master = true;
        END IF;

        -- 2. Update organization_members (Handles DB permissions)
        BEGIN
            UPDATE public.organization_members SET role = 'master' WHERE user_id = target_id;
            
            -- If user doesn't have an organization, add to the first one available
            IF NOT FOUND THEN
               INSERT INTO public.organization_members (organization_id, user_id, role)
               SELECT id, target_id, 'master' FROM public.organizations LIMIT 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback role if 'master' enum is restricted
            UPDATE public.organization_members SET role = 'admin' WHERE user_id = target_id;
        END;
        
        RAISE NOTICE 'User % (ID: %) successfully elevated to Founder status.', target_email, target_id;
    ELSE
        RAISE WARNING 'User % not found in auth.users. Please ensure the user has signed up first.', target_email;
    END IF;
END $$;
