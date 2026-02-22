-- ========================================================
-- SAAS MANAGEMENT SYSTEM (MASTER CONSOLE)
-- ========================================================

-- 1. SUPPORT TICKETS SYSTEM
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    category TEXT DEFAULT 'technical', -- technical, billing, content, feature_request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can see/create their own tickets
CREATE POLICY "Tickets: User view own" ON public.support_tickets 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.is_master_admin());

CREATE POLICY "Tickets: User create own" ON public.support_tickets 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Master can manage all
CREATE POLICY "Tickets: Master ALL" ON public.support_tickets 
FOR ALL TO authenticated 
USING (public.is_master_admin());

-- 2. TICKET COMMENTS (MESSAGING)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments: Viewable if ticket is viewable" ON public.ticket_comments 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets 
        WHERE id = ticket_id AND (user_id = auth.uid() OR public.is_master_admin())
    )
);

CREATE POLICY "Comments: Insert own" ON public.ticket_comments 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 3. USER PRESENCE TRACKING
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 4. MASTER DASHBOARD VIEW (RPC for heavy stats)
CREATE OR REPLACE FUNCTION public.get_saas_metrics()
RETURNS JSONB AS $$
DECLARE
    total_users INT;
    active_users INT;
    open_tickets INT;
    total_feeds INT;
    result JSONB;
BEGIN
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
