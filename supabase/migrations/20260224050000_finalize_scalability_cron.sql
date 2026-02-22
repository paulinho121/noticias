
-- ========================================================
-- FINALIZE: SCALABILITY CRON JOBS
-- ========================================================

-- 1. Unschedule old jobs to avoid conflicts
SELECT cron.unschedule('auto-sync-feeds-15min');

-- 2. New Main Job: Sync Feeds to Queue (Every 5 minutes)
-- Isso apenas coloca as tarefas na fila, é super rápido
SELECT cron.schedule(
  'sync-feeds-to-queue',
  '*/5 * * * *',
  'SELECT public.check_all_active_feeds()'
);

-- 3. The WORKER: Processes the Queue (Every 1 minute)
-- Este é o motor que realmente executa as chamadas de IA
-- Usamos pg_net para chamar a Edge Function de forma assíncrona
CREATE OR REPLACE FUNCTION public.call_queue_worker()
RETURNS void AS $$
DECLARE
  project_ref TEXT := 'aozbgeguelpphxhptrwy';
  service_key TEXT;
BEGIN
  project_ref := COALESCE(current_setting('vault.project_ref', true), project_ref);
  service_key := current_setting('vault.service_role_key', true);

  PERFORM net.http_post(
    url := 'https://' || project_ref || '.supabase.co/functions/v1/queue-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendamento do Worker
SELECT cron.schedule(
  'queue-worker-minutely',
  '* * * * *',
  'SELECT public.call_queue_worker()'
);

-- 4. Daily Maintenance: Purge old logs and completed tasks
SELECT cron.schedule(
  'daily-system-purge',
  '0 3 * * *', -- Às 3 da manhã
  'SELECT public.purge_old_system_data()'
);
