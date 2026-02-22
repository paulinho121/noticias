-- Elevate labwpplus@gmail.com to Super User status
DO $$
DECLARE
    target_email TEXT := 'labwpplus@gmail.com';
    target_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;
    
    IF target_id IS NOT NULL THEN
        -- 1. Update user_profiles (Essential for UI and most RLS)
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = target_id) THEN
            UPDATE public.user_profiles 
            SET is_master = true, 
                full_name = COALESCE(full_name, 'Super User')
            WHERE id = target_id;
        ELSE
            INSERT INTO public.user_profiles (id, is_master, full_name)
            VALUES (target_id, true, 'Super User')
            ON CONFLICT (id) DO UPDATE SET is_master = true;
        END IF;

        -- 2. Update organization_members (Handles DB permissions)
        BEGIN
            -- Try to set role to 'master'
            UPDATE public.organization_members SET role = 'master' WHERE user_id = target_id;
            
            -- If user doesn't have an organization entry, add to the first one available
            IF NOT FOUND THEN
               INSERT INTO public.organization_members (organization_id, user_id, role)
               SELECT id, target_id, 'master' FROM public.organizations ORDER BY created_at ASC LIMIT 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback role if 'master' enum is restricted/not present
            UPDATE public.organization_members SET role = 'admin' WHERE user_id = target_id;
        END;
        
        RAISE NOTICE 'User % (ID: %) successfully elevated to Super User status.', target_email, target_id;
    ELSE
        RAISE WARNING 'User % not found in auth.users. Please ensure the user has signed up first.', target_email;
    END IF;
END $$;
