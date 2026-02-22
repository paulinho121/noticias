
-- ========================================================
-- REFACTOR: TRIGGER TO QUEUE (SCALABILITY PHASE 3)
-- ========================================================

-- Atualiza o Gatilho para USAR A FILA em vez de chamadas HTTP diretas
-- Isso evita o travamento do banco quando entram muitas notícias de uma vez
CREATE OR REPLACE FUNCTION public.trigger_rewrite_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- 1. Só age se o status for 'pending'
  IF (NEW.status != 'pending') THEN
    RETURN NEW;
  END IF;

  -- 2. Busca o organization_id se não estiver presente
  IF (NEW.organization_id IS NULL) THEN
    SELECT organization_id INTO v_org_id FROM public.feeds WHERE id = NEW.feed_id;
    NEW.organization_id := v_org_id;
  END IF;

  -- 3. EM VEZ DE CHAMAR A API, COLOCA NA FILA DE REESCRITA
  INSERT INTO public.processing_queue (
    organization_id, 
    feed_id, 
    payload, 
    status, 
    priority
  ) VALUES (
    NEW.organization_id,
    NEW.feed_id,
    jsonb_build_object(
        'feedItemId', NEW.id, 
        'task', 'rewrite_content',
        'title', NEW.source_title
    ),
    'pending',
    1 -- Reescrita tem prioridade levemente maior que busca de feed
  );

  -- 4. Marcamos como 'processing' no item para o dashboard mostrar que algo está acontecendo
  NEW.status := 'processing';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
