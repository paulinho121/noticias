-- ========================================================
-- USER MANAGEMENT EXPANSION (BLOCKING & INDIVIDUAL MESSAGING)
-- ========================================================

-- 1. ADD BLOCKING STATUS TO PROFILES
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- 2. CREATE SYSTEM NOTIFICATIONS TABLE (Targeted Messaging)
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, success, error
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users: view own notifications" ON public.user_notifications 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.is_master_admin());

-- Master can create notifications for anyone
CREATE POLICY "Master: create notifications" ON public.user_notifications 
FOR INSERT TO authenticated 
WITH CHECK (public.is_master_admin());

-- Master can manage all notifications
CREATE POLICY "Master: manage all notifications" ON public.user_notifications 
FOR ALL TO authenticated 
USING (public.is_master_admin());

-- 3. ENFORCE BLOCKING (RLS SECURITY)
-- We add a check to the platform usage function if it exists, or just ensure UI handles it.
-- For a robust solution, we could add a check to all critical tables' RLS, 
-- but that depends on the current RLS complexity. 
-- For now, we will expose the status.

-- Helper function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = check_user_id AND is_blocked = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
