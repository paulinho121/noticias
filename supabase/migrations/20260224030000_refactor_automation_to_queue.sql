
-- ========================================================
-- REFACTOR: QUEUE-BASED AUTOMATION (SCALABILITY PHASE 2)
-- ========================================================

-- Atualiza a função principal para USAR A FILA em vez de chamar direto
CREATE OR REPLACE FUNCTION public.check_all_active_feeds()
RETURNS void AS $$
DECLARE
  feed_record RECORD;
BEGIN
  -- 1. Identifica Feeds que precisam rodar
  FOR feed_record IN (
    SELECT f.id, f.organization_id, s.interval_minutes, f.name
    FROM public.feeds f
    JOIN public.schedules s ON f.id = s.feed_id
    WHERE f.is_active = true 
    AND s.is_active = true
    AND (s.next_run IS NULL OR s.next_run <= now())
  ) LOOP
    
    -- Verifica Throttle (Limite do Plano)
    IF public.can_organization_queue_more(feed_record.organization_id) THEN
        
        -- Atualiza o agendamento
        UPDATE public.schedules 
        SET last_run = now(),
            next_run = now() + (feed_record.interval_minutes || ' minutes')::interval
        WHERE feed_id = feed_record.id;

        -- EM VEZ DE CHAMAR A API, COLOCA NA FILA
        INSERT INTO public.processing_queue (
            organization_id, 
            feed_id, 
            payload, 
            status, 
            priority
        ) VALUES (
            feed_record.organization_id,
            feed_record.id,
            jsonb_build_object('feedId', feed_record.id, 'task', 'sync_and_process'),
            'pending',
            CASE 
                WHEN (SELECT subscription_plan FROM organizations WHERE id = feed_record.organization_id) = 'pro' THEN 1
                WHEN (SELECT subscription_plan FROM organizations WHERE id = feed_record.organization_id) = 'enterprise' THEN 2
                ELSE 0
            END
        );
        
        RAISE NOTICE 'Feed % adicionado à fila de processamento.', feed_record.name;
    ELSE
        RAISE NOTICE 'Feed % ignorado por limite de concorrência da organização.', feed_record.name;
    END IF;
  END LOOP;

  -- 2. Publish items that are 'ready' (Opcional: também pode ser movido para fila futuro)
  PERFORM public.publish_ready_items();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
