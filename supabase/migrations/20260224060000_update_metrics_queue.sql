
-- ========================================================
-- UPDATE: SAAS METRICS WITH QUEUE MONITORING
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_saas_metrics()
RETURNS JSONB AS $$
DECLARE
    total_users INT;
    active_users INT;
    open_tickets INT;
    total_feeds INT;
    queue_pending INT;
    queue_processing INT;
    queue_failed INT;
    result JSONB;
BEGIN
    SELECT count(*) INTO total_users FROM public.user_profiles;
    SELECT count(*) INTO active_users FROM public.user_profiles WHERE last_seen_at > now() - interval '15 minutes';
    SELECT count(*) INTO open_tickets FROM public.support_tickets WHERE status = 'open';
    SELECT count(*) INTO total_feeds FROM public.feeds;
    
    -- Novas Métricas de Fila (Queue Monitor)
    SELECT count(*) INTO queue_pending FROM public.processing_queue WHERE status = 'pending';
    SELECT count(*) INTO queue_processing FROM public.processing_queue WHERE status = 'processing';
    SELECT count(*) INTO queue_failed FROM public.processing_queue WHERE status = 'failed' AND attempts >= 3;
    
    result := jsonb_build_object(
        'total_users', total_users,
        'active_now', active_users,
        'open_tickets', open_tickets,
        'total_feeds', total_feeds,
        'queue_pending', queue_pending,
        'queue_processing', queue_processing,
        'queue_failed', queue_failed
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
