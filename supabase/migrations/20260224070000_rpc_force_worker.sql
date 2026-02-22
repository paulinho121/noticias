
-- ========================================================
-- RPC: EXPOSE QUEUE WORKER FOR MASTER ADMIN
-- ========================================================

CREATE OR REPLACE FUNCTION public.force_queue_worker_manually()
RETURNS JSONB AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Verifica se é admin
    IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Chama a lógica do worker
    PERFORM public.call_queue_worker();
    
    RETURN jsonb_build_object('success', true, 'message', 'Worker disparado com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
