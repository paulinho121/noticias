
-- ========================================================
-- SCALABILITY & PERFORMANCE INFRASTRUCTURE (PHASE 1)
-- ========================================================

-- 1. Tabela de Fila de Processamento (Queue System)
CREATE TABLE IF NOT EXISTS public.processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 0, -- 0: Free, 1: Pro, 2: Enterprise
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE -- Para evitar que múltiplos workers peguem a mesma tarefa
);

-- 2. Índices de Alta Performance (Otimização de Consultas)
CREATE INDEX IF NOT EXISTS idx_feed_items_org_status ON public.feed_items(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_org_created ON public.logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_lookup ON public.processing_queue(status, scheduled_for, priority DESC);

-- 3. Função de Manutenção Automática (Purge de Dados Antigos)
-- Mantém o banco leve deletando o que não é mais necessário
CREATE OR REPLACE FUNCTION public.purge_old_system_data()
RETURNS void AS $$
BEGIN
    -- Deleta logs com mais de 7 dias
    DELETE FROM public.logs WHERE created_at < (now() - INTERVAL '7 days');
    
    -- Deleta tarefas concluídas da fila com mais de 3 dias
    DELETE FROM public.processing_queue WHERE status = 'completed' AND processed_at < (now() - INTERVAL '3 days');
    
    -- Opcional: Arquivar ou deletar itens de feed muito antigos que já foram publicados a mais de 60 dias
    -- DELETE FROM public.feed_items WHERE status = 'published' AND processed_at < (now() - INTERVAL '60 days');
    
    RAISE NOTICE 'Limpeza de sistema concluída.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função de Throttling por Plano (Rate Limiting)
-- Decide se uma organização pode colocar mais itens na fila agora
CREATE OR REPLACE FUNCTION public.can_organization_queue_more(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Busca o plano
    SELECT subscription_plan INTO v_plan FROM public.organizations WHERE id = p_org_id;
    
    -- Define limites de concorrência na fila
    v_limit := CASE 
        WHEN v_plan = 'pro' THEN 20 
        WHEN v_plan = 'enterprise' THEN 100
        ELSE 5 -- Free/Trial
    END;
    
    -- Conta quantos itens estão pendentes/processando
    SELECT count(*) INTO v_count 
    FROM public.processing_queue 
    WHERE organization_id = p_org_id AND status IN ('pending', 'processing');
    
    RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Agendamento da Limpeza Automática via pg_cron (se disponível)
SELECT cron.schedule('0 3 * * *', 'SELECT public.purge_old_system_data()');
